import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")

class Models:
    def __init__(self):
        self.llm_request = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            api_key=groq_api_key,
            temperature=0.2,
            max_tokens=2048
        )

    def generate_test_case(self, story_json: dict, prompt_text: str) -> str:
        """
        Generate a BDD test case using the LLM.
        """
        input_text = f"""
        You are a QA assistant. Generate a Gherkin BDD feature file.

        User Story Summary: {story_json.get("User_Story_Summary")}
        User Story Description: {story_json.get("User_Story_Description")}
        Story Details: {story_json.get("story_details")}

        Instruction: {prompt_text}

        Format strictly as:
        Feature: <summary + description in one-two sentences>
          Scenario: <steps derived from description>
        """

        response = self.llm_request.invoke(input_text)
        return response.content