import { FormEvent, useState } from "react";
import { api } from "../lib/api";

export default function Generate() {
  const [theme, setTheme] = useState("dawn");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await api.post("/generate", { theme, prompt });
    setResult(JSON.stringify(response.data, null, 2));
  }

  async function handleQuickpost() {
    const response = await api.post("/quickpost", { theme, content: { prompt } });
    setResult(JSON.stringify(response.data, null, 2));
  }

  return (
    <section className="card">
      <h2>Generate Threadlight</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="theme">Theme</label>
        <input id="theme" value={theme} onChange={(event) => setTheme(event.target.value)} />

        <label htmlFor="prompt">Prompt</label>
        <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} />

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button className="button" type="submit">
            Generate
          </button>
          <button className="button" type="button" onClick={handleQuickpost}>
            Quickpost
          </button>
        </div>
      </form>

      {result && (
        <pre style={{ marginTop: "24px" }}>{result}</pre>
      )}
    </section>
  );
}
