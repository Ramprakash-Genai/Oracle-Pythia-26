import React, { useState, useEffect } from "react";
import "./QA_bot_UI.css";

function QABotUI() {
  const [inputs, setInputs] = useState({ project: "", sprint: "", key: "" });
  const [story, setStory] = useState(null);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [generatedTestCase, setGeneratedTestCase] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/projects")
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(err => console.error("Error fetching projects:", err));
  }, []);

  useEffect(() => {
    if (inputs.project) {
      fetch(`http://localhost:5000/sprints/${inputs.project}`)
        .then(res => res.json())
        .then(data => setSprints(data.sprints || []))
        .catch(err => console.error("Error fetching sprints:", err));
    } else {
      setSprints([]);
    }
  }, [inputs.project]);

  useEffect(() => {
    if (inputs.sprint) {
      fetch(`http://localhost:5000/stories/${inputs.sprint}`)
        .then(res => res.json())
        .then(data => setStories(data.stories || []))
        .catch(err => console.error("Error fetching stories:", err));
    } else {
      setStories([]);
    }
  }, [inputs.sprint]);

  const handleChange = (e) => setInputs({ ...inputs, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs)
      });
      const data = await response.json();
      if (response.ok) {
        setStory(data);
        setError("");
      } else {
        setError(data.detail || "Error occurred");
      }
    } catch {
      setError("Backend not reachable");
    } finally {
      setLoading(false);
    }
  };

  const getSprintName = (id) => {
    const sprint = sprints.find(s => String(s.id) === String(id));
    return sprint ? sprint.name : id;
  };

  const handleGenerateTestCase = async () => {
    setLoading(true);
    const jsonData = {
      User_Story_Summary: story.summary,
      User_Story_Description: story.description,
      story_details: {
        Sprint: getSprintName(inputs.sprint),
        Story_Assigned_To: story.assignee,
        Story_Number: story.key
      },
      prompt_file: "app/prompts/generate_test_case.txt"
    };

    try {
      const response = await fetch("http://localhost:5000/generate_testcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData)
      });
      const result = await response.json();
      setGeneratedTestCase(result.generated_test_case);
      setShowPopup(true);
    } catch (err) {
      console.error("Error generating test case:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/approve_testcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_number: story.key,
          generated_test_case: generatedTestCase
        })
      });
      const result = await response.json();
      // ✅ Updated popup message
      setConfirmMessage(
        <>
          <span className="confirm-success">Test Case Approved Successfully!</span><br/>
          <span className="confirm-path">Test case saved path: {result.message}</span>
        </>
      );
      setShowConfirm(true);
      setShowPopup(false);
    } catch (err) {
      console.error("Error approving test case:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    await handleGenerateTestCase();
    setLoading(false);
    // ✅ Updated popup message
    setConfirmMessage(<span className="confirm-success">Successfully Generated a New Test Case!</span>);
    setShowConfirm(true);
  };

  const handleCancel = () => {
    setLoading(true);
    setTimeout(() => {
      setShowPopup(false);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="qa-container">
      {/* Loader overlay */}
      {loading && (
        <div className="qa-loader">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {/* Confirmation popup */}
      {showConfirm && (
        <div className="qa-confirm-popup">
          <div className="qa-confirm-content">
            <h3>Notification</h3>
            <p>{confirmMessage}</p>
            <button className="okay-btn" onClick={() => setShowConfirm(false)}>OKAY</button>
          </div>
        </div>
      )}

      <div className="qa-sidebar">
        <h2>Next Gen QA BOT</h2>

        <div className="qa-field">
          <label htmlFor="project">Project:</label>
          <select id="project" name="project" value={inputs.project} onChange={handleChange}>
            <option value="">Select Project</option>
            {projects.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
        </div>

        <div className="qa-field">
          <label htmlFor="sprint">Sprint:</label>
          <select id="sprint" name="sprint" value={inputs.sprint} onChange={handleChange}>
            <option value="">Select Sprint</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="qa-field">
          <label htmlFor="story">Story:</label>
          <select id="story" name="key" value={inputs.key} onChange={handleChange}>
            <option value="">Select Story</option>
            {stories.map(st => <option key={st.key} value={st.key}>{st.key} - {st.summary}</option>)}
          </select>
        </div>

        <div className="qa-buttons">
          <button className="okay-btn" onClick={handleSubmit}>OKAY</button>
          <button className="cancel-btn" onClick={() => setInputs({ project: "", sprint: "", key: "" })}>CANCEL</button>
        </div>
      </div>

      <div className="qa-main">
        {error && (
          <div className="qa-error-popup">
            <p>{error}</p>
            <button onClick={() => setError("")}>OKAY</button>
          </div>
        )}

        {story && (
          <div className="qa-story">
            <h3><strong>User Story Summary:</strong></h3>
            <p>{story.summary}</p>

            <h3><strong>User Story Description:</strong></h3>
            <ul className="qa-description-list">
              {story.description.split("\n").map((line, index) =>
                line.trim() !== "" && <li key={index}>{line}</li>
              )}
            </ul>

            <h3><strong>Story Details:</strong></h3>
            <div className="qa-meta">
              <p><strong>Sprint:</strong> {getSprintName(inputs.sprint)}</p>
              <p><strong>Story Assigned to:</strong> {story.assignee}</p>
              <p><strong>Story Number:</strong> {story.key}</p>
            </div>

            <button className="create-test-btn" onClick={handleGenerateTestCase}>
              Generate a test case
            </button>
          </div>
        )}

        {showPopup && (
          <div className="qa-popup">
            <div className="qa-popup-content">
              <h3>Generated Test Case</h3>
              <pre className="qa-testcase">{generatedTestCase}</pre>
              <div className="qa-popup-buttons">
                <button className="approve-btn" onClick={handleApprove}>TEST CASE APPROVED</button>
                <button className="regenerate-btn" onClick={handleRegenerate}>REGENERATE THE TEST CASE</button>
                <button className="cancel-btn" onClick={handleCancel}>CANCEL</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QABotUI;

