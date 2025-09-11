import os
import subprocess
import google.genai as genai
from dotenv import load_dotenv
import time
import json, re
import glob
load_dotenv()
from moviepy.editor import VideoFileClip, vfx, concatenate_videoclips

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not set")
client = genai.Client()

def slow_down_video(input_path, output_path, speed_factor=0.5):
    clip = VideoFileClip(input_path)
    slowed_clip = clip.fx(vfx.speedx, speed_factor)
    slowed_clip.write_videofile(output_path, audio=True)
    clip.close()
    slowed_clip.close()

def strip_code_fences(s):
    # removes json fences if present
    return re.sub(r"^```[a-zA-Z]*\n|\n```$", "", s.strip())

def process_video_and_summarize(file_path):
    """
    Uploads a video file and asks a Gemini model to summarize it.
    This method is for all file sizes.
    """
    try:
        print(f"Uploading file: {file_path}...")
        uploaded_file = client.files.upload(file=file_path)
        print(f"File uploaded successfully with name: {uploaded_file.name}")

        print("Waiting for file to be processed...")
        while client.files.get(name=uploaded_file.name).state == "PROCESSING":
            print("File is still processing, waiting for 5 seconds...")
            time.sleep(5)
        if client.files.get(name=uploaded_file.name).state == "FAILED":
            return {"ok" : False, "error": "File processing failed."}
        print("File processing complete.")

        print("Generating summary...")
        
        # CHANGE SCRIPT IN CONTENTS ARRAY 
        context1 = "This video is a video of a basketball player shooting around. Can you count how many shots he makes, as well as misses, as well as field goal percentage?"
        context2 = "This video is a video of a basketball player shooting around. Can you count how many shots he makes, as well as misses, as well as field goal percentage? A shot is defined as the player shooting the ball towards the hoop, and a make is defined as the ball going through the hoop. A miss is defined as the ball not going through the hoop. Please provide bullet points of each made and missed shot by timestamp."
        context3 = "This video is a video of a full court basketball game, but only one half court of it. During the game, can you count how many shots are made in the video, as well as give the timestamps of each made shot in the video? A shot is defined as the player shooting the ball towards the hoop, and a make is defined as the ball going through the hoop. A miss is defined as the ball not going through the hoop. Please provide bullet points of each made and missed shot by timestamp."
        prompt4 = """Act as a world-class basketball analyst with a deep understanding of shot mechanics, court geography, and statistical analysis. Your task is to meticulously analyze the entire video to identify every distinct shot attempt. The analysis should be comprehensive and structured for clarity. For the video provided, please provide a detailed report on every shot attempt, including the following analysis for each one:
                    Subject Recognition (Subject): Identify the player who is either shooting the ball or in the immediate process of a layup, and describe in depth who they are and what they look like / what they are wearing.
                    Shot Location (Location): Based on the player's position on the court, categorize the shot location from the following list:
                    Right corner/Right baseline
                    Left corner/Left baseline
                    Right wing
                    Left wing
                    Right elbow
                    Left elbow
                    Right block
                    Left block
                    Top of the key
                    Mid-range (if not an exact match to the above)
                    In the paint (if not an exact match to the above)
                    Other (if none of the above apply)
                    Shot Type (ShotType): Determine if the shot is a 'Jumpshot' or a 'Layup'.
                    Time Stamp of Shot (TimeStamp): Identify the exact timestamp of the shot, formatted as HH:MM:SS.
                    Make/Miss (Outcome): Analyze the position of the ball relative to the hoop, the player's follow-through, and the surrounding context (e.g., net movement) to determine the outcome. Conclude whether the shot is a 'Make' or a 'Miss'. If the outcome is not determinable, state 'Undetermined'.
                    Your response should be formatted as a structured JSON object containing a list of shot events, with each event represented as a separate object (do not include any formatting or extra texts sucn as code fences etc.)."""
        prompt5 = """
                    Act as an elite basketball coach and analyst. Analyze every shot attempt in this video with the following structure:

                    - Player Identification (if possible)
                    - Shot Type (Jump shot, Layup, Dunk, etc.)
                    - Shot Location (e.g., right corner, top of the key)
                    - Time of Shot (timestamp or visual marker)
                    - Result (Make or Miss)
                    - Form Analysis (brief breakdown of mechanics)
                    - Defensive Pressure (if present)

                    Be thorough, structured, and use bullet points for each shot.
                    """
        prompt6 = """
                Act as a world-class basketball analyst with a deep understanding of shot mechanics, court geography, and statistical analysis. Your task is to analyze the entire video and identify every distinct shot attempt **only from players actively participating in the ongoing 5v5 game**. 

                Please ignore shots taken by people who are not on the court as part of the active game (e.g., warmup shooters, people on the sidelines, or players not engaged in real-time gameplay).

                To help determine who is in the game, consider:
                - Players who are consistently on the court and moving as part of the team flow
                - Jerseys, movement patterns, or formations indicative of team play
                - Whether other players are defending or watching passively

                For each shot attempt **from active players only**, provide:

                - **Subject Recognition (SR)**: Identify the player taking the shot.
                - **Shot Location (SL)**: One of the following:
                    - Right corner/Right baseline
                    - Left corner/Left baseline
                    - Right wing
                    - Left wing
                    - Right elbow
                    - Left elbow
                    - Right block
                    - Left block
                    - Top of the key
                    - Mid-range (if not an exact match to the above)
                    - In the paint (if not an exact match to the above)
                    - Other (if none of the above apply)
                - **Shot Type (ST)**: 'Jumpshot' or 'Layup'
                - **Time Stamp of Shot (TS)**: Format as HH:MM:SS
                - **Make/Miss (MM)**: Based on ball trajectory, hoop interaction, and player reaction. If unclear, state 'Undetermined'

                Only include **active game** shots in your structured JSON output:
                ```json
                [
                {
                    "SR": "...",
                    "SL": "...",
                    "ST": "...",
                    "TS": "...",
                    "MM": "..."
                },
                ...
                ]
                """
        prompt7 = """
                Act as a world-class basketball analyst with deep expertise in shot mechanics, court geography, and statistical breakdowns. Your task is to analyze the provided basketball video and extract detailed shot data in a structured format.

                Carefully identify every distinct shot attempt, and for each one, extract the following fields:

                - **subject**: Describe the player who takes the shot (e.g., "Player in black hoodie and black shorts").
                - **location**: One of the following court locations:
                    - Right corner / Right baseline
                    - Left corner / Left baseline
                    - Right wing
                    - Left wing
                    - Right elbow
                    - Left elbow
                    - Right block
                    - Left block
                    - Top of the key
                    - Mid-range (if not an exact match)
                    - In the paint (if not an exact match)
                    - Other (if none of the above apply)
                - **shotType**: Either "jump_shot" or "layup".
                - **timestamp**: The time of the shot in the video, formatted as HH:MM:SS.
                - **outcome**: "made", "missed", or "undetermined", based on the ball's trajectory, net movement, and player follow-through.
                - **confidence**: A float between 0 and 1 representing how confident you are in the shot analysis (e.g., 0.92).
                - **playerPosition**: An approximate location of the player when shooting, using coordinates in a `{ "x": <0-100>, "y": <0-100> }` format, where 0-100 is a relative scale of the court space.

                ---

                Your response **must** be a single valid JSON object in the following structure (do not include any extra text, formatting, or explanation):

                ```json
                {
                "analysis": {
                    "shots": [
                    {
                        "timestamp": "00:00:43",
                        "shotType": "jump_shot",
                        "outcome": "made",
                        "confidence": 0.92,
                        "description": "A high-arc jump shot from the top of the key",
                        "playerPosition": { "x": 35, "y": 60 }
                    }
                    // additional shots here...
                    ],
                    "gameStats": {
                    "totalShots": <int>,
                    "madeShots": <int>,
                    "shootingPercentage": <int>,
                    "shotTypes": {
                        "jump_shot": <int>,
                        "layup": <int>
                    },
                    "quarterBreakdown": [
                        { "quarter": 1, "shots": <int>, "made": <int> },
                        { "quarter": 2, "shots": <int>, "made": <int> },
                        { "quarter": 3, "shots": <int>, "made": <int> },
                        { "quarter": 4, "shots": <int>, "made": <int> }
                    ]
                    },
                    "basketDetection": {
                    "basketsVisible": <int>,
                    "courtDimensions": { "width": 28, "height": 15 }
                    },
                    "playerTracking": {
                    "playersDetected": <int>,
                    "movementAnalysis": []
                    },
                    "highlights": [
                    {
                        "timestamp": <int>,
                        "type": "Three Pointer" | "Dunk",
                        "description": "Highlight-worthy description",
                        "importance": 0.85
                    }
                    // optional additional highlights
                    ]
                }
                }
                """
        resp = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[uploaded_file, prompt4]
            #,generation_config={"response_mime_type": "application/json,"}
        )
        text_respone = resp.text
        raw_text = getattr(resp, "text", None)
        if not raw_text:
            try:
                raw_text = resp.candidates[0].content.parts[0].text
            except Exception as e:
                return {"ok": False, "error": f"No text in Gemini response: {e}"}

        print("RAW GEMINI OUTPUT:", strip_code_fences(raw_text))

        return strip_code_fences(raw_text) # return output as a string for now
        
        parsed = None
        try:
            parsed = json.loads(strip_code_fences(raw_text))
        except json.JSONDecodeError:
            return {"ok": False, "error": "Gemini returned non-JSON output"}

        return {"ok": True, "results": parsed}
        
    except FileNotFoundError:
        return {"ok": False, "error": f"File not found: {file_path}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def highlight_output(gem_output):
    
    parsed = json.loads(gem_output)
    if isinstance(gem_output, list):
        return "Gemini output is a list"
    if isinstance(gem_output, str):
        try:
            parsed = json.loads(gem_output)
        except json.JSONDecodeError:
            return("Gemini output is a str but not valid JSON")  
    else:
        parsed = gem_output
    if isinstance(parsed, list):
        timestamps = [shot["TimeStamp"] for shot in parsed if "TimeStamp" in shot] # ALL TIMESTAMPS
        makes_timestamps = [] # ONLY MAKES TIMESTAMPS
        
        for shot in parsed:
            if "TimeStamp" in shot and "Outcome" in shot:
                if shot["Outcome"].lower() == "make":
                    makes_timestamps.append(shot["TimeStamp"])
    elif isinstance(parsed, dict):
        return("Gemini output is a dict, not a list")
    else:
        return("Gemini is returning neither list or dict")
    print(f"Make timestamps: {makes_timestamps}")
    return makes_timestamps

def timestamp_to_seconds(timestamp_str):
    parts = timestamp_str.split(':')
    hours, minutes, seconds = map(int, parts)
    return hours * 3600 + minutes * 60 + seconds

def create_highlights_moviepy(video_path, timestamps, clip_duration=6, output_dir="VideoDataset"):
    try:
        # create output directory if does not exist
        os.makedirs(output_dir, exist_ok=True)
        print(f"Creating highlights in {output_dir}...")
        timestamp_seconds = [timestamp_to_seconds(s) for s in timestamps]
        print(f"Converted {len(timestamp_seconds)} timestamps")
        # loading video
        video = VideoFileClip(video_path)
        video_duration = video.duration

        for i, (timestamp_str, timestamp_sec) in enumerate(zip(timestamps, timestamp_seconds)):
            try:
                end_time = min(timestamp_sec + clip_duration, video_duration)
                if timestamp_sec < video_duration:
                    # extract clip
                    clip = video.subclip(timestamp_sec, end_time)
                    output_path = os.path.join(output_dir, f"clip_{i+1}_{timestamp_str.replace(':', '-')}.mp4")
                    clip.write_videofile(output_path, 
                                         audio_codec='aac',
                                           verbose=False, 
                                           logger='bar')
                    clip.close()
                    print(f"Created clip {i+1}: {timestamp_str}")
                else:
                    print(f"Skipped timestamp at {timestamp_str}")
            except Exception as e:
                print(f"Error creating clip at timestamp: {timestamp_str}: {e}")
                continue
        video.close()
        print("All videos processed correctly.")
    except FileNotFoundError:
        print(f"Error: video not found: {video_path}")
    except Exception as e:
        print(f"Error processing video: {e}")

def create_highlights_ffmpeg(video_path, timestamps, clip_duration=6, output_dir="clips"):
    try:
        os.makedirs(output_dir, exist_ok=True)
        print(f"Created output directory: {output_dir}")
        
        for i, timestamp_str in enumerate(timestamps):
            output_path = os.path.join(output_dir, f"clip_{i+1}_{timestamp_str.replace(':', '-')}.mp4")
            
            try:
                # FFmpeg command to extract clip
                cmd = [
                    'ffmpeg',
                    '-ss', timestamp_str,           # Start time (HH:MM:SS)
                    '-i', video_path,               # Input video
                    '-t', str(clip_duration),       # Duration in seconds
                    '-c', 'copy',                   # Copy streams (no re-encoding = much faster)
                    '-avoid_negative_ts', 'make_zero',
                    '-y',                           # Overwrite output files
                    output_path
                ]
                
                # Run FFmpeg
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    print(f"✓ Created clip {i+1}: {timestamp_str}")
                else:
                    print(f"✗ Error creating clip {i+1}: {result.stderr}")
                    
            except Exception as e:
                print(f"✗ Error processing {timestamp_str}: {e}")
                
    except Exception as e:
        print(f"✗ General error: {e}")

def combine_clips_ffmpeg(clips_dir="clips", output_dir="combined", output_filename="combined_video.mp4"):
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Get all clip files and sort them
        clip_files = sorted(glob.glob(os.path.join(clips_dir, "*.mp4")))
        
        if not clip_files:
            print("No clip files found!")
            return
        
        # Create the full output path
        output_path = os.path.join(output_dir, output_filename)
        
        # Create a text file listing all clips for FFmpeg
        filelist_path = "temp_filelist.txt"
        with open(filelist_path, 'w') as f:
            for clip_file in clip_files:
                f.write(f"file '{os.path.abspath(clip_file)}'\n")
        
        # FFmpeg command to concatenate
        cmd = [
            'ffmpeg',
            '-f', 'concat',
            '-safe', '0',
            '-i', filelist_path,
            '-c', 'copy',  # No re-encoding, just copy
            '-y',          # Overwrite output
            output_path    # Full path including folder
        ]
        
        print(f"Combining {len(clip_files)} clips...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Clean up temp file
        os.remove(filelist_path)
        
        if result.returncode == 0:
            print(f"✓ Combined video saved as: {output_path}")
        else:
            print(f"✗ Error combining clips: {result.stderr}")
            
    except Exception as e:
        print(f"✗ Error: {e}")


if __name__ == "__main__":
    file_name = "meshooting2.mp4"
    file_path = f"videoDataset/{file_name}"
    #slowed_file_path = f"videoDataset/{file_name.split('.')[0]}_slowed.mp4"
    #slow_down_video(file_path, slowed_file_path, speed_factor=0.5)
    #res = process_video_and_summarize(file_path)
    #make_timestamps = highlight_output(res)
    make_timestamps_mock = ['00:00:11', '00:00:26', '00:00:48'] # timestamps for testing
    create_highlights_ffmpeg(file_path, make_timestamps_mock, clip_duration=6, output_dir="clips")
    combine_clips_ffmpeg(clips_dir="clips", output_dir="combined", output_filename="combined_video.mp4")

