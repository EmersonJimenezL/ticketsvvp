type JsPdfModule = typeof import("jspdf");
type JsPdfConstructor = JsPdfModule["default"];

let jsPdfConstructorPromise: Promise<JsPdfConstructor> | null = null;

export function loadJsPdf(): Promise<JsPdfConstructor> {
  if (!jsPdfConstructorPromise) {
    jsPdfConstructorPromise = import("jspdf").then((module) => module.default);
  }

  return jsPdfConstructorPromise;
}
