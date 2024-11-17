import React, { useState } from "react";
import axios from "axios";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";

import "./index.css";

const Dashboard = ({ user }) => {
  const [rawResponse, setRawResponse] = useState("");
  const [recommendations, setRecommendations] = useState({});
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [editingStep, setEditingStep] = useState(null);
  const [editedValue, setEditedValue] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [editedLineValue, setEditedLineValue] = useState("");

  const handleFileUpload = (event) => {
    event.preventDefault();

    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
      alert("Please upload an Excel or CSV file__.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      sessionStorage.setItem("uploadedFile", e.target.result);
      alert("File stored in session.");
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("file", file);

    axios
      .post("http://127.0.0.1:5000/get-recommendations", formData)
      .then((response) => {
        setRawResponse(JSON.stringify(response.data, null, 2));

        const recommendations = response.data.recommendations || {};
        console.log(recommendations, "recommendations");

        setRecommendations(recommendations);
      })
      .catch((error) =>
        console.error("Error fetching recommendations:", error)
      );
  };

  const handleRecommendationsSubmit = () => {
    const formData = new FormData();
    const storedFile = sessionStorage.getItem("uploadedFile");

    if (storedFile) {
      const byteCharacters = atob(storedFile.split(",")[1]);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: "text/csv" });
      formData.append("file", blob, "uploaded_file.csv");
    } else {
      alert("No file found in session.");
      return;
    }

    // Add selected options to form data
    formData.append("selectedOptions", JSON.stringify(selectedOptions));

    // Include the generated code if it exists
    if (code) {
      formData.append("generatedCode", code);
    }

    setLoading(true);

    axios
      .post("http://127.0.0.1:5000/process-selections", formData)
      .then((response) => {
        console.log("Response from backend:", response.data);
        setCode(response.data.code ? String(response.data.code) : "");
      })
      .catch((error) => console.error("Error processing selections:", error))
      .finally(() => setLoading(false));
  };

  console.log(code, "--------------");

  const handleStepDoubleClick = (category, stepKey, stepDescription) => {
    setEditingStep({ category, stepKey });
    setEditedValue(stepDescription);
  };

  const saveChanges = () => {
    if (editingStep) {
      const { category, stepKey } = editingStep;
      setRecommendations((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [stepKey]: editedValue,
        },
      }));
      setEditingStep(null);
      setEditedValue("");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      alert("Code copied to clipboard!");
    });
  };

  const handleLineDoubleClick = (index, line) => {
    setEditingLineIndex(index);
    setEditedLineValue(line);
  };

  const saveEditedLine = () => {
    if (editingLineIndex !== null) {
      const lines = code.split("\n");
      lines[editingLineIndex] = editedLineValue; // Update the edited line
      setCode(lines.join("\n")); // Join the lines back into a single string
      setEditingLineIndex(null); // Reset editing index
      setEditedLineValue(""); // Clear the edited value
    }
  };

  return (
    <div>
      <body>
        <h1 className="text-center mt-4 font-semibold text-2xl">
          Upload Your Data for Cleansing
        </h1>
        <form
          id="uploadForm"
          onSubmit={handleFileUpload}
          encType="multipart/form-data"
        >
          <input
            type="file"
            id="fileInput"
            name="file"
            accept=".csv, .xlsx, .xls"
            required
          />
          <button type="submit">Upload</button>
        </form>

        <div className="!border-dashed border-gray-300 border-2" id="recommendationsContainer">
          {Object.entries(recommendations).map(([category, steps], index) => (
            <div key={index}>
              <h3 className="font-bold uppercase">{category}</h3>{" "}
              {/* Display the category name */}
              {Object.entries(steps).map(([stepKey, stepDescription]) => (
                <div
                  key={stepKey}
                  onDoubleClick={() =>
                    handleStepDoubleClick(category, stepKey, stepDescription)
                  }
                >
                  {editingStep?.category === category &&
                  editingStep.stepKey === stepKey ? (
                    <input
                      type="text"
                      value={editedValue}
                      onChange={(e) => setEditedValue(e.target.value)}
                      onBlur={saveChanges} // Save changes on blur
                      onKeyDown={(e) => e.key === "Enter" && saveChanges()} // Save on Enter key
                      className="editing-input" // Add a class for styling
                    />
                  ) : (
                    <label>
                      <input
                        type="checkbox"
                        value={stepDescription}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedOptions((prev) =>
                            prev.includes(value)
                              ? prev.filter((option) => option !== value)
                              : [...prev, value]
                          );
                        }}
                      />
                      {stepKey}: {stepDescription}{" "}
                      {/* Display each step's description */}
                    </label>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center my-4">
            <div className="spinner mr-2">
              <div className="bounce1"></div>
              <div className="bounce2"></div>
              <div className="bounce3"></div>
            </div>
            <span className="text-lg font-semibold">
              Code is generating, please wait...
            </span>
          </div>
        ) : (
          code && (
            <>
              <div className="relative">
                <h3 className="mt-4 font-semibold text-2xl">Generated Code:</h3>
                <pre className="border border-gray-300 rounded p-2">
                  {code.split("\n").map((line, index) => (
                    <div key={index}>
                      {editingLineIndex === index ? (
                        <input
                          type="text"
                          value={editedLineValue}
                          onChange={(e) => setEditedLineValue(e.target.value)}
                          onBlur={saveEditedLine} // Save on blur
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditedLine(); // Save on Enter key
                          }}
                          className="editing-input border rounded bg-black"
                        />
                      ) : (
                        <div
                          onDoubleClick={() =>
                            handleLineDoubleClick(index, line)
                          } // Enable double-click editing
                        >
                          {line}
                        </div>
                      )}
                    </div>
                  ))}
                </pre>
                <button
                  className="absolute bg-white top-12 right-0 mt-2 mr-2"
                  onClick={copyToClipboard}
                >
                  <ClipboardDocumentIcon className="h-6 w-6 text-gray-500 hover:text-black" />
                </button>
              </div>
            </>
          )
        )}

        <button
          id="submitRecommendations"
          onClick={handleRecommendationsSubmit}
        >
          Submit Choices
        </button>

        <h3 className="mt-4 font-semibold text-2xl">Raw Response:</h3>
        <textarea
          id="rawResponse"
          rows="10"
          cols="80"
          value={rawResponse}
          readOnly
          className="border border-gray-400 rounded p-2 mt-4 w-full"
        />

        <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
      </body>
    </div>
  );
};

export default Dashboard;
