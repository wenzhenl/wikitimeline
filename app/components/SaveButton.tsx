"use client";

import { useState } from "react";

interface SaveButtonProps {
  pageNames: string[];
}

const SaveButton: React.FC<SaveButtonProps> = ({ pageNames }) => {
  const [description, setDescription] = useState("");
  const [contributor, setContributor] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          contributor,
          pageNames,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save collection");
      }

      console.log("Collection saved successfully", data.newCollection);
      setIsSaved(true);
      setShowModal(false);
    } catch (err: unknown) {
      console.error("Error in handleSave:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {!isSaved && (
        <>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white p-2 rounded"
          >
            Save
          </button>
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-4 rounded z-50">
                <h2 className="text-2xl mb-4">Save Collection</h2>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border p-2 w-full mb-4"
                  placeholder="Enter description"
                />
                <input
                  type="text"
                  value={contributor}
                  onChange={(e) => setContributor(e.target.value)}
                  className="border p-2 w-full mb-4"
                  placeholder="Enter contributor (optional)"
                />
                <button
                  onClick={handleSave}
                  className={`bg-green-500 text-white p-2 rounded ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-red-500 text-white p-2 rounded ml-2"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            </div>
          )}
        </>
      )}
      {isSaved && (
        <p className="text-green-500">Collection saved successfully!</p>
      )}
    </div>
  );
};

export default SaveButton;
