import { useEffect, useRef } from "react";

import type { SupportedLanguage } from "./api.js";

interface CodeEditorProps {
  value: string;
  language: SupportedLanguage | "arena";
  height: number;
  onChange: (value: string) => void;
}

type MonacoModule = typeof import("monaco-editor");

type MonacoEditorInstance = import("monaco-editor").editor.IStandaloneCodeEditor;

const monacoLanguageMap: Record<CodeEditorProps["language"], string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  lua: "lua",
  arena: "plaintext"
};

export function CodeEditor(props: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoModule | null>(null);
  const onChangeRef = useRef(props.onChange);

  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  useEffect(() => {
    let cancelled = false;
    let model: import("monaco-editor").editor.ITextModel | null = null;
    let subscription: import("monaco-editor").IDisposable | null = null;

    async function mountEditor(): Promise<void> {
      if (!containerRef.current) {
        return;
      }

      const monaco = await import("monaco-editor");
      if (cancelled || !containerRef.current) {
        return;
      }

      monacoRef.current = monaco;
      model = monaco.editor.createModel(props.value, monacoLanguageMap[props.language]);
      const editor = monaco.editor.create(containerRef.current, {
        model,
        automaticLayout: true,
        fontSize: 14,
        lineHeight: 22,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        roundedSelection: true,
        padding: { top: 14, bottom: 14 },
        wordWrap: props.language === "arena" ? "off" : "on",
        theme: "vs"
      });

      subscription = editor.onDidChangeModelContent(() => {
        onChangeRef.current(editor.getValue());
      });

      editorRef.current = editor;
    }

    void mountEditor();

    return () => {
      cancelled = true;
      subscription?.dispose();
      editorRef.current?.dispose();
      model?.dispose();
      editorRef.current = null;
      monacoRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.getValue() !== props.value) {
      editor.setValue(props.value);
    }
  }, [props.value]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) {
      return;
    }

    monaco.editor.setModelLanguage(model, monacoLanguageMap[props.language]);
  }, [props.language]);

  return <div className="code-editor" ref={containerRef} style={{ height: props.height }} />;
}
