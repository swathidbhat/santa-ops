"use client";

import { useState, useEffect, useRef } from "react";

interface GiftRow {
  id: string;
  name: string;
  giftIdea: string;
  budget: number;
  productLink?: string;
  productImage?: string;
  approvalStatus?: "Pending" | "Approved" | "Denied";
  orderStatus?: "Not started" | "Ordered" | "Manual purchase required" | "Failed";
  riddle?: string;
  cardLink?: string;
}

interface OrchestrationResult {
  rowId: string;
  name: string;
  status: "success" | "partial" | "failed";
  steps: {
    discovery: boolean;
    approval: boolean;
    order: boolean;
    riddle: boolean;
    card: boolean;
  };
  error?: string;
}

type Mode = "discovery" | "orders" | "riddles" | "cards" | "full";

export default function Home() {
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<OrchestrationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load gifts on mount
  useEffect(() => {
    fetchGifts();
  }, []);

  const fetchGifts = async () => {
    try {
      const response = await fetch("/api/gifts");
      const data = await response.json();
      setGifts(data.gifts || []);
    } catch {
      console.error("Failed to fetch gifts");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/gifts", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setGifts(data.gifts);
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearGifts = async () => {
    await fetch("/api/gifts", { method: "DELETE" });
    setGifts([]);
    setResults([]);
  };

  const updateApproval = async (id: string, status: "Approved" | "Denied") => {
    const response = await fetch(`/api/gifts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus: status }),
    });
    
    if (response.ok) {
      const updated = await response.json();
      setGifts(gifts.map((g) => (g.id === id ? updated : g)));
    }
  };

  const runOrchestration = async (mode: Mode) => {
    if (gifts.length === 0) {
      setError("Please upload a CSV file first");
      return;
    }

    setLoading(true);
    setError(null);
    setLastMode(mode);

    try {
      const response = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Orchestration failed");
      }

      setResults(data.results);
      // Refresh gifts to get updated data
      await fetchGifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const colors: Record<string, string> = {
      Pending: "bg-amber-900/30 text-amber-400 border-amber-600/30",
      Approved: "bg-green-900/30 text-green-400 border-green-600/30",
      Denied: "bg-red-900/30 text-red-400 border-red-600/30",
      Ordered: "bg-green-900/30 text-green-400 border-green-600/30",
      "Manual purchase required": "bg-amber-900/30 text-amber-400 border-amber-600/30",
      Failed: "bg-red-900/30 text-red-400 border-red-600/30",
      "Not started": "bg-gray-800 text-gray-400 border-gray-600/30",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs border ${colors[status] || "bg-gray-800 text-gray-400"}`}>
        {status}
      </span>
    );
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Snowflakes */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="snowflake"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 5}s`,
            fontSize: `${8 + Math.random() * 12}px`,
          }}
        >
          ❄
        </div>
      ))}

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-4 mb-4">
            <span className="text-5xl">🎅</span>
            <h1 className="text-5xl font-bold gradient-text">Santa Ops</h1>
            <span className="text-5xl">🎄</span>
          </div>
          <p className="text-lg text-gray-400">
            Upload a CSV → Discover gifts → Approve → Order → Generate cards
          </p>
        </header>

        {/* Upload Section */}
        <section className="mb-8">
          <div className="bg-[#16202a] border border-[#2f3336] rounded-xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className={`px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 rounded-lg font-medium cursor-pointer hover:from-red-500 hover:to-red-600 transition-all ${
                    uploading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {uploading ? "Uploading..." : "📤 Upload CSV"}
                </label>
                {gifts.length > 0 && (
                  <>
                    <span className="text-gray-400">
                      {gifts.length} gift{gifts.length !== 1 ? "s" : ""} loaded
                    </span>
                    <a
                      href="/api/gifts/export"
                      download="santa-ops-gifts.csv"
                      className="px-4 py-2 bg-[#16202a] border border-[#2f3336] rounded-lg text-sm hover:border-green-600/50 transition-colors"
                    >
                      📥 Export CSV
                    </a>
                    <button
                      onClick={clearGifts}
                      className="text-sm text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
              <div className="text-sm text-gray-500">
                CSV format: <code className="bg-[#0f1419] px-1.5 py-0.5 rounded">Name, Gift Idea, Budget</code>
              </div>
            </div>
          </div>
        </section>

        {/* Action Cards */}
        {gifts.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <button
              onClick={() => runOrchestration("discovery")}
              disabled={loading}
              className="gift-card bg-[#16202a] border border-[#2f3336] rounded-xl p-4 text-left hover:border-red-600/50 disabled:opacity-50"
            >
              <div className="text-2xl mb-2">🔍</div>
              <h3 className="font-semibold text-sm">Discover</h3>
              <p className="text-gray-500 text-xs mt-1">Find products</p>
            </button>

            <button
              onClick={() => runOrchestration("orders")}
              disabled={loading}
              className="gift-card bg-[#16202a] border border-[#2f3336] rounded-xl p-4 text-left hover:border-green-600/50 disabled:opacity-50"
            >
              <div className="text-2xl mb-2">🛒</div>
              <h3 className="font-semibold text-sm">Orders</h3>
              <p className="text-gray-500 text-xs mt-1">Process approved</p>
            </button>

            <button
              onClick={() => runOrchestration("riddles")}
              disabled={loading}
              className="gift-card bg-[#16202a] border border-[#2f3336] rounded-xl p-4 text-left hover:border-amber-500/50 disabled:opacity-50"
            >
              <div className="text-2xl mb-2">📜</div>
              <h3 className="font-semibold text-sm">Riddles</h3>
              <p className="text-gray-500 text-xs mt-1">Generate hints</p>
            </button>

            <button
              onClick={() => runOrchestration("cards")}
              disabled={loading}
              className="gift-card bg-[#16202a] border border-[#2f3336] rounded-xl p-4 text-left hover:border-purple-500/50 disabled:opacity-50"
            >
              <div className="text-2xl mb-2">🎴</div>
              <h3 className="font-semibold text-sm">Cards</h3>
              <p className="text-gray-500 text-xs mt-1">Create Gamma cards</p>
            </button>

            <button
              onClick={() => runOrchestration("full")}
              disabled={loading}
              className="gift-card bg-gradient-to-br from-red-900/30 to-green-900/30 border border-red-600/30 rounded-xl p-4 text-left hover:border-red-500/50 disabled:opacity-50"
            >
              <div className="text-2xl mb-2">🎁</div>
              <h3 className="font-semibold text-sm">Full Pipeline</h3>
              <p className="text-gray-500 text-xs mt-1">Run everything</p>
            </button>
          </section>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-6">
            <div className="inline-flex items-center gap-3 bg-[#16202a] border border-[#2f3336] rounded-full px-6 py-3">
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-300">Processing {lastMode}...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Gifts Table */}
        {gifts.length > 0 && (
          <section className="bg-[#16202a] border border-[#2f3336] rounded-xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-[#2f3336]">
              <h3 className="font-semibold">🎁 Gift List</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0f1419] text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Gift Idea</th>
                    <th className="px-4 py-3 text-right">Budget</th>
                    <th className="px-4 py-3 text-center">Product</th>
                    <th className="px-4 py-3 text-center">Approval</th>
                    <th className="px-4 py-3 text-center">Order</th>
                    <th className="px-4 py-3 text-center">Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2f3336]">
                  {gifts.map((gift) => (
                    <tr key={gift.id} className="hover:bg-[#1a2630]">
                      <td className="px-4 py-3 font-medium">{gift.name}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                        {gift.giftIdea}
                      </td>
                      <td className="px-4 py-3 text-right text-green-400">
                        ${gift.budget}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {gift.productLink ? (
                          <a
                            href={gift.productLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            View →
                          </a>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {gift.productLink && !gift.approvalStatus ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => updateApproval(gift.id, "Approved")}
                              className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs hover:bg-green-900/50"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => updateApproval(gift.id, "Denied")}
                              className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs hover:bg-red-900/50"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          getStatusBadge(gift.approvalStatus)
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(gift.orderStatus)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {gift.cardLink ? (
                          <a
                            href={gift.cardLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline"
                          >
                            Open →
                          </a>
                        ) : gift.riddle ? (
                          <span className="text-amber-400" title={gift.riddle}>
                            📜
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Results */}
        {results.length > 0 && !loading && (
          <section className="bg-[#16202a] border border-[#2f3336] rounded-xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-[#2f3336] flex items-center justify-between">
              <h3 className="font-semibold">
                ✨ Results <span className="text-gray-500">({results.length} processed)</span>
              </h3>
              <span className="text-sm text-gray-500 font-mono">{lastMode}</span>
            </div>
            <div className="divide-y divide-[#2f3336]">
              {results.map((result) => (
                <div key={result.rowId} className="px-6 py-3 flex items-center gap-4">
                  <span
                    className={`text-lg ${
                      result.status === "success"
                        ? "text-green-400"
                        : result.status === "partial"
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {result.status === "success" ? "✓" : result.status === "partial" ? "◐" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.name}</div>
                    {result.error && (
                      <div className="text-xs text-red-400 truncate">{result.error}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(result.steps).map(([step, done]) => (
                      <span
                        key={step}
                        className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          done ? "bg-green-900/30 text-green-400" : "bg-gray-800 text-gray-500"
                        }`}
                      >
                        {step.slice(0, 4)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {gifts.length === 0 && (
          <section className="bg-[#16202a] border border-[#2f3336] rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">Upload a CSV to get started</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Create a CSV file with columns: <strong>Name</strong>, <strong>Gift Idea</strong>, <strong>Budget</strong>
            </p>
            <div className="bg-[#0f1419] rounded-lg p-4 max-w-md mx-auto text-left font-mono text-sm">
              <div className="text-gray-500">Example CSV:</div>
              <div className="text-gray-300 mt-2">
                Name,Gift Idea,Budget<br />
                Alice,Wireless headphones,100<br />
                Bob,Coffee maker,75<br />
                Carol,Board game,50
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-600 text-sm">
          <p>Built with Next.js • OpenAI • Gamma</p>
          <p className="mt-1">🎄 Happy Holidays! 🎁</p>
        </footer>
      </div>
    </main>
  );
}
