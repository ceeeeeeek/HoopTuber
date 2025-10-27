# new utility functions for video processing and handling
from datetime import timedelta
import os
import subprocess
import google.genai as genai
from dotenv import load_dotenv
import time
import json, re
import glob
import tempfile
import logging
load_dotenv()
from moviepy.editor import VideoFileClip, vfx, concatenate_videoclips
from prompts import prompt_4, json_input, prompt_shot_outcomes_only
from uuid import uuid4 
from VideoInputTest import strip_code_fences, convert_timestamp_to_seconds, CreateHighlightVideo2

Creator = CreateHighlightVideo2()


def convert_timestamp_to_seconds2(timestamp):
    parts = timestamp.split(':')
    hours, minutes, seconds = map(int, parts)
    total_seconds = (hours * 3600) + (minutes * 60) + seconds
    return total_seconds

def timestamp_maker_2(gem_output, buffer=5):
    logging.info(f"DEBUG @ timestamp_maker: gemini output before process is: {type(gem_output)}")
    # Handle dict input (error responses)
    if isinstance(gem_output, list):
        # Already parsed as a list, use directly
        parsed = gem_output
    elif isinstance(gem_output, dict):
        if "error" in gem_output or not gem_output.get("ok", True):
            error_msg = gem_output.get("error", "Unknown error")
            raise ValueError(f"Cannot extract timestamps from error response: {error_msg}")
        # If dict but not an error, might be a valid response, treat as parsed data
        parsed = gem_output
    elif isinstance(gem_output, str):
        # String input - parse it
        try:
            gem_output_stripped = strip_code_fences(gem_output)
            parsed = json.loads(gem_output_stripped)
            if isinstance(parsed, str):
                parsed = json.loads(parsed) # try to parse again if it's a string
        except json.JSONDecodeError as e:
            raise ValueError(f"Gemini output is a str but not valid JSON: {e}")
    
    # Now process the parsed data
    #if isinstance(parsed, list):
    highlights = [] # ALL TIMESTAMPS

    for shot in parsed:
        if "TimeStamp" in shot and "Outcome" in shot:
            start = convert_timestamp_to_seconds(shot["TimeStamp"])
            end = start + buffer  # add buffer to define end time
            outcome = shot["Outcome"].lower()
            
            highlights.append({
                "start": start,
                "end": end,
                "outcome": outcome
            })
    return highlights
def merge_overlapping(highlights):
    if not highlights:
        return []

    # sort by start time
    highlights.sort(key=lambda x: x["start"])
    merged = [highlights[0]]

    for current in highlights[1:]:
        last = merged[-1]

        # if overlap or touch (<=)
        if current["start"] <= last["end"]:
            # merge end times (take the max)
            last["end"] = max(last["end"], current["end"])
            # optionally combine outcomes if you want to store them
            last["outcome"] += f", {current['outcome']}"
        else:
            merged.append(current)

    return merged

def process_highlights(parsed):
    highlights = timestamp_maker_2(parsed, buffer=5)
    merged_highlights = merge_overlapping(highlights)
    return merged_highlights


def seconds_to_timestamp(seconds: int) -> str:
    """Convert seconds (int or float) to HH:MM:SS format."""
    td = timedelta(seconds=int(seconds))
    total_seconds = int(td.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

def return_enhanced_timestamps(gem_output):
    """
    Takes an input list like:
    [
      {"start": 11, "end": 16, "outcome": "miss"},
      {"start": 26, "end": 31, "outcome": "make"},
      {"start": 44, "end": 54, "outcome": "make, miss"}
    ]
    and returns a frontend-friendly array of enhanced highlight objects.
    """
    try:
        processed_data = []

        for shot in gem_output:
            start_sec = shot.get("start")
            end_sec = shot.get("end")
            outcome = shot.get("outcome", "unknown")

            # skip invalid entries
            if start_sec is None or end_sec is None:
                continue

            processed_data.append({
                "id": str(uuid4()),
                "timestamp_start": seconds_to_timestamp(start_sec),
                "timestamp_end": seconds_to_timestamp(end_sec),
                "outcome": outcome,
                "subject": None,
                "shot_type": None,
                "shot_location": None,
                "status": "pending_review"
            })

        return {"ok": True, "results": processed_data}

    except Exception as e:
        return {"ok": False, "error": str(e)}