"use client";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export default function HomePage() {
  const router = useRouter();
  const [wikiLink, setWikiLink] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = new URL(wikiLink);
    const pageName = url.pathname.split("/").pop();
    router.push(`/timeline/${pageName}?url=${encodeURIComponent(wikiLink)}`);
  };

  return (
    <div>
      <h1>Enter Wikipedia Link</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={wikiLink}
          onChange={(e) => setWikiLink(e.target.value)}
          placeholder="https://en.wikipedia.org/wiki/Lu_Xun"
          required
        />
        <button type="submit">Go</button>
      </form>
    </div>
  );
}
