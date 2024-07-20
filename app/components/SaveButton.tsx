"use client";

import { useState } from "react";
import { BASE_URL } from "@/config";

interface SaveButtonProps {
  pageNames: string[];
}

const SaveButton: React.FC<SaveButtonProps> = ({ pageNames }) => {
  const [description, setDescription] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    console.log("Save button clicked");
    console.log("Description:", description);
    console.log("Page Names:", pageNames);

    try {
      const response = await fetch(`${BASE_URL}/api/collection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          pageNames,
        }),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        setIsSaved(true);
        setShowModal(false);
      } else {
        const responseData = await response.json();
        console.error("Error saving collection:", responseData.error);
        setError(responseData.error || "Unknown error");
      }
    } catch (err) {
      console.error("Error in handleSave:", err);
      setError(err.message || "Unknown error");
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
                <button
                  onClick={handleSave}
                  className="bg-green-500 text-white p-2 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-red-500 text-white p-2 rounded ml-2"
                >
                  Cancel
                </button>
                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SaveButton;
