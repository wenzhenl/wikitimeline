"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const HomePage = () => {
  const router = useRouter();
  const [wikiLink, setWikiLink] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const pageName = wikiLink.split("/").pop();
    router.push(`/timeline/${pageName}`);
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
};

export default HomePage;
