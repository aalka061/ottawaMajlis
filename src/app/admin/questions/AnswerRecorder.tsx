"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ANSWER_AUDIO_TYPE,
  LONGEST_RECORDING_SECONDS,
} from "@/lib/audio";
import { keepAnswerRecording, startAnswerUpload } from "../actions";

/**
 * Whatever came out of the browser, as MP3.
 *
 * Recorders disagree: Safari hands back MP4, Chrome and Firefox hand back
 * WebM/Opus, and an iPhone will not play that. Rather than hope the person
 * answering remembers which browser to open, everything is decoded and
 * re-encoded here, once, into the one format every browser plays.
 *
 * The encoder is fetched only when it is needed — nobody reading the register
 * should be made to download an MP3 encoder — and the loop hands the page back
 * between blocks so a five-minute answer does not freeze the tab.
 */
async function toMp3(input: Blob, onProgress: (done: number) => void) {
  const { Mp3Encoder } = await import("@breezystack/lamejs");

  const context = new AudioContext();
  let audio: AudioBuffer;
  try {
    audio = await context.decodeAudioData(await input.arrayBuffer());
  } finally {
    await context.close();
  }

  // Mono: an answer is one voice, and a second channel is twice the file for
  // nothing. Two channels are averaged rather than one being thrown away.
  const length = audio.length;
  const left = audio.getChannelData(0);
  const right = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;

  const samples = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const value = right ? (left[i] + right[i]) / 2 : left[i];
    const clamped = Math.max(-1, Math.min(1, value));
    samples[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const encoder = new Mp3Encoder(1, audio.sampleRate, 64);
  const parts: Uint8Array[] = [];
  // A multiple of an MP3 frame, big enough that the yielding below costs
  // nothing and small enough that the page stays awake.
  const BLOCK = 1152 * 50;
  for (let at = 0; at < samples.length; at += BLOCK) {
    const encoded = encoder.encodeBuffer(samples.subarray(at, at + BLOCK));
    if (encoded.length > 0) parts.push(encoded);
    onProgress(Math.min(1, at / samples.length));
    await new Promise((resume) => setTimeout(resume, 0));
  }
  const tail = encoder.flush();
  if (tail.length > 0) parts.push(tail);

  return new Blob(parts as BlobPart[], { type: ANSWER_AUDIO_TYPE });
}

function clock(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

type Stage = "idle" | "recording" | "working" | "ready" | "saving";

/**
 * Recording an answer on the page, and keeping it.
 *
 * The written answer stays required beside this — a recording cannot be
 * skimmed, searched, quoted, or heard by everyone — so what this replaces is
 * nothing: it is the answer in the teacher's own voice, beside the gist of it
 * in writing.
 *
 * Nothing is kept by recording it. A recording is played back first and then
 * kept or dropped, because the first take of anything is a throat being
 * cleared.
 */
export function AnswerRecorder({
  questionId,
  onKept,
}: {
  questionId: string;
  /** Called once a recording is kept, so the flow can ask for the gist. */
  onKept?: () => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [seconds, setSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [take, setTake] = useState<{ blob: Blob; url: string } | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const ticking = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (ticking.current) clearInterval(ticking.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
      if (take) URL.revokeObjectURL(take.url);
    };
    // Cleanup on unmount only: the take's URL is revoked as it is replaced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dropTake = () => {
    if (take) URL.revokeObjectURL(take.url);
    setTake(null);
  };

  const encode = async (source: Blob) => {
    setStage("working");
    setProgress(0);
    try {
      const mp3 = await toMp3(source, setProgress);
      dropTake();
      setTake({ blob: mp3, url: URL.createObjectURL(mp3) });
      setStage("ready");
    } catch {
      setStage("idle");
      setError(
        "That could not be turned into an MP3. If it came from somewhere else, try a different file — or paste a link to it below.",
      );
    }
  };

  const start = async () => {
    setError(null);
    dropTake();

    // Recording wants a microphone and a page served over https. Asked at the
    // press rather than on load: what the browser can do is not known on the
    // server, and a button that is missing teaches nobody why.
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        "This browser will not record here — recording needs a microphone and a page served over https. Choose a file instead, or paste a link below.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const machine = new MediaRecorder(stream);
      chunks.current = [];
      machine.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      machine.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (ticking.current) clearInterval(ticking.current);
        const raw = new Blob(chunks.current, { type: machine.mimeType });
        if (raw.size > 0) await encode(raw);
        else setStage("idle");
      };
      machine.start();
      recorder.current = machine;
      setSeconds(0);
      setStage("recording");
      ticking.current = setInterval(() => {
        setSeconds((n) => {
          // Stops itself at the cap rather than refusing the recording
          // afterwards, which would lose whatever was said.
          if (n + 1 >= LONGEST_RECORDING_SECONDS) machine.stop();
          return n + 1;
        });
      }, 1000);
    } catch {
      setError(
        "The browser would not give the page a microphone. Allow it in the address bar, or use the file below.",
      );
    }
  };

  const stop = () => recorder.current?.stop();

  const keep = async () => {
    if (!take) return;
    setStage("saving");
    setError(null);
    try {
      const signed = await startAnswerUpload(questionId);
      if ("error" in signed) throw new Error(signed.error);

      const put = await fetch(signed.url, {
        method: "PUT",
        body: take.blob,
        headers: { "content-type": ANSWER_AUDIO_TYPE },
      });
      if (!put.ok) throw new Error(`storage answered ${put.status}`);

      const kept = await keepAnswerRecording(questionId, signed.path);
      if ("error" in kept && kept.error) throw new Error(kept.error);

      dropTake();
      setStage("idle");
      router.refresh();
      onKept?.();
    } catch (problem) {
      setStage("ready");
      setError(
        `It was not kept: ${problem instanceof Error ? problem.message : "the upload failed"}. The recording is still here — try again.`,
      );
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
          {stage === "recording" ? (
            <>
              <button type="button" onClick={stop} className="btn btn-danger">
                Stop
              </button>
              <span className="font-mono text-sm text-madder">
                Recording {clock(seconds)} · stops itself at{" "}
                {clock(LONGEST_RECORDING_SECONDS)}
              </span>
            </>
          ) : stage === "working" ? (
            <span className="font-mono text-sm text-slate">
              Preparing the recording… {Math.round(progress * 100)}%
            </span>
          ) : stage === "saving" ? (
            <span className="font-mono text-sm text-slate">Keeping it…</span>
          ) : (
            <button
              type="button"
              onClick={start}
              className="btn btn-quiet"
              disabled={stage !== "idle" && stage !== "ready"}
            >
              {take ? "Record again" : "Record an answer"}
            </button>
          )}
      </div>

      {take ? (
        <div className="border border-line bg-stone p-4">
          <p className="field-label">This take</p>
          <audio controls src={take.url} className="mt-3 w-full" />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={keep}
              className="btn"
              disabled={stage === "saving"}
            >
              Keep this recording
            </button>
            <button
              type="button"
              onClick={dropTake}
              className="font-mono text-[0.6875rem] tracking-[0.14em] text-slate uppercase hover:text-madder"
              disabled={stage === "saving"}
            >
              Throw it away
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <label className="field-label" htmlFor="audio-file">
          Or a recording you already have
        </label>
        <input
          id="audio-file"
          type="file"
          accept="audio/*"
          className="field-input mt-2 file:mr-3 file:border-0 file:bg-transparent file:font-mono file:text-xs file:uppercase"
          disabled={stage === "working" || stage === "saving"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              setError(null);
              void encode(file);
            }
          }}
        />
        <p className="mt-1.5 max-w-prose text-sm text-slate">
          A voice note exported from WhatsApp, or anything else. It is turned
          into an MP3 here too, so it plays on every phone.
        </p>
      </div>

      {error ? (
        <p className="max-w-prose border-l-2 border-madder pl-3 text-sm text-madder">
          {error}
        </p>
      ) : null}
    </div>
  );
}
