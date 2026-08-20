export type FormState = {
  status: "idle" | "ok" | "error";
  message: string;
  fieldErrors: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
