import React, { useState, useEffect } from "react";
import "./QA_bot_UI.css";

function QABotUI() {
  const [inputs, setInputs] = useState({ project: "", sprint: "", key: "" });
  const [story, setStory] = useState(null);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);

  // Fetch projects
  useEffect(() => {
    fetch("http://localhost:5000/projects")
      .then(res => res.json())
      .then(data => setProjects(data.projects || []))
      .catch(err => console.error("Error fetching projects:", err));
  }, []);

  // Fetch sprints when project changes
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

  // Fetch stories when sprint changes
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
    }
  };

  // Helper to get sprint name by ID
  const getSprintName = (id) => {
    const sprint = sprints.find(s => String(s.id) === String(id));
    return sprint ? sprint.name : id;
  };

  return (
    <div className="qa-container">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default QABotUI;