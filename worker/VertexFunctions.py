import os
import subprocess
import google.genai as genai
from google.genai import types
from dotenv import load_dotenv
import vertexai
from vertexai.generative_models import GenerativeModel, Part
import time
import json, re
import glob
import tempfile
import logging
load_dotenv()
from moviepy.editor import VideoFileClip, vfx, concatenate_videoclips
from prompts import prompt_4, json_input, prompt_shot_outcomes_only, prompt_shot_outcomes_only2
from uuid import uuid4 
from utils import convert_to_mp4, format_gemini_output

from VideoInputTest import strip_code_fences, timestamp_maker, CreateHighlightVideo2

# MAIN VERTEX FUNCTION: READS FROM GCS URI, RETURNS GEMINI OUTPUT AS DICT

def vertex_summarize(gcs_uri, videoDurationSec=0):
    vertex_client = genai.Client(
        vertexai=True,
        project="hooptuber-dev-1234",
        location="us-central1",
        http_options=types.HttpOptions(timeout=600000)
    )
    print(f"VERTEX SUMMARIZATION: VIDEO LENGTH BEING INPUTTED: {videoDurationSec}")
    try:
        max_retries = 2
        for attempt in range(max_retries):
            logging.info(f"DEBUG: Vertex summarize, attempt {attempt+1}")
            model = "gemini-2.5-flash"
            prompt = prompt_shot_outcomes_only2(videoDurationSec)
            response = vertex_client.models.generate_content(
                model=model,
                contents=[
                    prompt,
                    types.Part.from_uri(
                        file_uri = gcs_uri,
                        mime_type = "video/mp4"
                    ),
                ],
            )
            logging.info(f"VERTEX: Response received.")
            break
            
        print(type(response))

        text_response = response.text
        raw_text = getattr(response, "text", None)
        if not raw_text:
            try:
                raw_text = response.candidates[0].content.parts[0].text
            except Exception as e:
                return {"ok": False, "error": f"VERTEX: No text in Gemini response: {e}"}
        clean_text = strip_code_fences(raw_text).strip() # return output as a string for now
        print("VERTEX RAW GEMINI OUTPUT:", strip_code_fences(raw_text))
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError as e:
            logging.info(f"(VERTEX_SUMMARIZE): Failed to parse Gemini output as JSON: {e} ")
            return clean_text
    except FileNotFoundError:
        return {"ok": False, "error": f"VERTEX: File not found: {gcs_uri}"}
    except Exception as e:
        return {"ok": False, "VERTEX: error": str(e)}
    

"""

MAIN VERTEX FUNCTION: READS FROM GCS URI, RETURNS CLEANED DATA FOR HIGHLIGHT CREATION

"""
def vertex_data_cleaned(gcs_uri, videoDurationSec=0):
    # 1. Run Vertex
    vertex_output = vertex_summarize(gcs_uri, videoDurationSec)
    # 2. If Vertex returned error
    if isinstance(vertex_output, dict) and not vertex_output.get("ok", True):
        return vertex_output  # pass error up unchanged
    Creator = CreateHighlightVideo2()
    # 3. Extract timestamps in seconds
    timestamps = timestamp_maker(vertex_output)
    # 4. Convert them to merged (start, end) tuples
    tuple_ranges = Creator.converting_tester(timestamps)
    # 5. Combine original JSON + merged timestamps
    final_formatted = format_gemini_output(vertex_output, tuple_ranges)

    return final_formatted
    