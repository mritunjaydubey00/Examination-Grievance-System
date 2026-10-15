import { useState } from "react";
import { getDocumentUrl } from "../../services/grievanceService.js";

function SupportingDocuments({ documents }) {
  const [links, setLinks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadLinks() {
    setLoading(true);
    setError("");
    try {
      const documentLinks = await Promise.all(
        documents.map(async (document) => ({
          ...document,
          url: await getDocumentUrl(document.path),
        })),
      );
      setLinks(documentLinks);
      setLoaded(true);
    } catch (loadError) {
      setError(loadError.message || "Could not load supporting documents.");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(event) {
    if (event.currentTarget.open && !loaded && !loading && !error) {
      loadLinks();
    }
  }

  if (!documents.length) return null;

  return (
    <details className="supporting-documents" onToggle={handleToggle}>
      <summary>Supporting documents ({documents.length})</summary>
      {loading && <p className="document-dropdown-message">Loading files…</p>}
      {error && (
        <div className="document-dropdown-message" role="status">
          <span>{error}</span>
          <button type="button" onClick={loadLinks}>
            Try again
          </button>
        </div>
      )}
      {loaded && (
        <ul className="document-dropdown-list">
          {links.map((document) => (
            <li key={document.path}>
              <a href={document.url} target="_blank" rel="noreferrer">
                {document.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export default SupportingDocuments;
