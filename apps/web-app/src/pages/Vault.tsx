import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface VaultRecord {
  id: string;
  theme: string;
  posts: Array<Record<string, unknown>>;
  created_at: string;
}

export default function Vault() {
  const vaultQuery = useQuery({
    queryKey: ["vault"],
    queryFn: async () => {
      const response = await api.get<VaultRecord[]>("/vault");
      return response.data;
    }
  });

  async function exportVault() {
    const response = await api.get("/vault/export");
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vault-${new Date().toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card">
      <h2>Vault Records</h2>
      <button className="button" type="button" onClick={exportVault}>
        Export Vault
      </button>
      {vaultQuery.isLoading && <p>Mapping memory...</p>}
      {vaultQuery.data && (
        <ul>
          {vaultQuery.data.map((record) => (
            <li key={record.id}>
              <strong>{record.theme}</strong>
              <pre>{JSON.stringify(record.posts, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
