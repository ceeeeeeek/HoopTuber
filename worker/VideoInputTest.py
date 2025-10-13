import os
import subprocess
import google.genai as genai
from dotenv import load_dotenv
import time
import json, re
import glob
import tempfile
load_dotenv()
from moviepy.editor import VideoFileClip, vfx, concatenate_videoclips
from prompts import prompt_4, json_input

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not set")
client = genai.Client()

class SlowVideo:
    def __init__(self, input_path, output_path, speed_factor=0.5):
        self.input_path = input_path
        self.output_path = output_path
        self.speed_factor = speed_factor
    def slow_down_video(self):
        clip = VideoFileClip(self.input_path)
        slowed_clip = clip.fx(vfx.speedx, self.speed_factor)
        slowed_clip.write_videofile(self.output_path, audio=True)
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

        prompt4 = prompt_4() # prompts are saved in prompts.py

        # Retry logic with exponential backoff for 503 errors
        max_retries = 3
        retry_delay = 5  # Start with 5 seconds

        for attempt in range(max_retries):
            try:
                resp = client.models.generate_content(
                    model="gemini-2.5-pro",
                    contents=[uploaded_file, prompt4]
                    #,generation_config={"response_mime_type": "application/json,"}
                )
                break  # Success, exit retry loop
            except Exception as e:
                error_str = str(e)
                if "503" in error_str or "UNAVAILABLE" in error_str or "timed out" in error_str.lower():
                    if attempt < max_retries - 1:
                        print(f"Attempt {attempt + 1} failed with timeout/503. Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        print(f"All {max_retries} attempts failed.")
                        return {"ok": False, "error": f"Gemini API timeout after {max_retries} attempts: {error_str}"}
                else:
                    # Different error, don't retry
                    return {"ok": False, "error": error_str}
        text_respone = resp.text
        raw_text = getattr(resp, "text", None)
        if not raw_text:
            try:
                raw_text = resp.candidates[0].content.parts[0].text
            except Exception as e:
                return json.dumps({"ok": False, "error": f"No text in Gemini response: {e}"})

        clean_text = strip_code_fences(raw_text).strip() # return output as a string for now
        print("RAW GEMINI OUTPUT:", strip_code_fences(raw_text))
        return clean_text
        
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

def timestamp_maker(gem_output):
    # Handle dict input (error responses)
    if isinstance(gem_output, dict):
        error_msg = gem_output.get("error", "Unknown error")
        raise ValueError(f"Cannot extract timestamps from error response: {error_msg}")

    # Ensure we have a string
    if not isinstance(gem_output, str):
        raise TypeError(f"Expected string input, got {type(gem_output)}")

    try:
        gem_output_stripped = strip_code_fences(gem_output)
        parsed = json.loads(gem_output_stripped)
        if isinstance(parsed, str):
            parsed = json.loads(parsed) # try to parse again if it's a string
    except json.JSONDecodeError:
        return("Gemini output is a str but not valid JSON")

    if isinstance(parsed, list):
        timestamps = [shot["TimeStamp"] for shot in parsed if "TimeStamp" in shot] # ALL TIMESTAMPS
        makes_timestamps = [] # ONLY MAKES TIMESTAMPS

        for shot in parsed:
            if "TimeStamp" in shot and "Outcome" in shot:
                if shot["Outcome"].lower() == "make":
                    makes_timestamps.append(shot["TimeStamp"])
    elif isinstance(parsed, dict):
        return("Gemini output is a dict, not a list")
    elif isinstance(parsed, str):
        return("Gemini is returning a str")
    else:
        return("Gemini is returning neither list or dict or str")
    return makes_timestamps

class CreateHighlightVideo:
    def __init__(self, video_path, output_dir="clips", combined_dir="combined", clip_duration=6):
        self.video_path = video_path
        self.output_dir = output_dir
        self.combined_dir = combined_dir
        self.clip_duration = clip_duration

        # Make sure the clip output directory exists
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.combined_dir, exist_ok=True)

    def create_highlights_ffmpeg(self, timestamps):
        try:
            for i, timestamp_str in enumerate(timestamps):
                output_path = os.path.join(
                    self.output_dir,
                    f"clip_{i+1}_{timestamp_str.replace(':', '-')}.mp4"
                )

                cmd = [
                    'ffmpeg',
                    '-ss', timestamp_str,           # Start time (HH:MM:SS)
                    '-i', self.video_path,          # Input video
                    '-t', str(self.clip_duration),  # Duration in seconds
                    '-c', 'copy',                   # No re-encoding
                    '-avoid_negative_ts', 'make_zero',
                    '-y',                           # Overwrite
                    output_path
                ]

                result = subprocess.run(cmd, capture_output=True, text=True)

                if result.returncode == 0:
                    print(f"✓ Created clip {i+1}: {timestamp_str}")
                else:
                    print(f"✗ Error creating clip {i+1}: {result.stderr}")

        except Exception as e:
            print(f"General error: {e}")

    def clear_folder(self, folder_path):
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
                elif os.path.isdir(file_path):
                    self.clear_folder(file_path)
                    os.rmdir(file_path)
            except Exception as e:
                print(f"Error deleting: {file_path}. Reason: {e}")
        print(f"Cleared folder: {folder_path}")

    def combine_clips_ffmpeg(self, output_filename="combined_video.mp4"):
        try:
            clip_files = sorted(glob.glob(os.path.join(self.output_dir, "*.mp4")))

            if not clip_files:
                print("No clip files found!")
                return

            output_path = os.path.join(self.combined_dir, output_filename)
            filelist_path = "temp_filelist.txt"

            with open(filelist_path, 'w') as f:
                for clip_file in clip_files:
                    f.write(f"file '{os.path.abspath(clip_file)}'\n")

            cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', filelist_path,
                '-c', 'copy',
                '-y',
                output_path
            ]

            print(f"Combining {len(clip_files)} clips...")
            result = subprocess.run(cmd, capture_output=True, text=True)

            os.remove(filelist_path)

            if result.returncode == 0:
                print(f"✓ Combined video saved as: {output_path}")
            else:
                print(f"✗ Error combining clips: {result.stderr}")

        except Exception as e:
            print(f"✗ Error: {e}")

class CreateHighlightVideo2:
    def __init__(self, clip_duration=5):
        self.clip_duration = clip_duration

    def create_highlights_ffmpeg(self, timestamps, in_path, out_path):
        """
        Creates highlight video from timestamps and saves to out_path
        
        Args:
            timestamps: List of timestamp strings (e.g., ["00:00:11", "00:00:26"])
            in_path: Input video file path
            out_path: Output highlight video file path
        """
        if not timestamps:
            print("No timestamps provided")
            return False
            
        # Use temporary directory for intermediate clips
        with tempfile.TemporaryDirectory() as temp_dir:
            clip_files = []
            
            try:
                # Create individual clips
                for i, timestamp_str in enumerate(timestamps):
                    clip_path = os.path.join(temp_dir, f"clip_{i+1}.mp4")
                    
                    cmd = [
                        'ffmpeg',
                        '-ss', timestamp_str,           # Start time (HH:MM:SS)
                        '-i', in_path,                  # Input video
                        '-t', str(self.clip_duration),  # Duration in seconds
                        '-c', 'copy',                   # No re-encoding
                        '-avoid_negative_ts', 'make_zero',
                        '-y',                           # Overwrite
                        clip_path
                    ]
                    """
                    EDGE CASE NOT REALLY: HANDLE
                    will be times that the highlight times overlap.
                    In that case, maybe start the next highlight at the end of the previous highlight?
                    H
                    
                    """
                    result = subprocess.run(cmd, capture_output=True, text=True)

                    if result.returncode == 0:
                        clip_files.append(clip_path)
                        print(f"✓ Created clip {i+1}: {timestamp_str}")
                    else:
                        print(f"✗ Error creating clip {i+1}: {result.stderr}")

                # If we have clips, combine them
                if clip_files:
                    return self._combine_clips(clip_files, out_path, temp_dir)
                else:
                    print("No clips were created successfully")
                    return False
                    
            except Exception as e:
                print(f"✗ General error: {e}")
                return False

    def _combine_clips(self, clip_files, out_path, temp_dir):
        """
        Combines individual clips into final highlight video
        
        Args:
            clip_files: List of clip file paths
            out_path: Final output video path
            temp_dir: Temporary directory for filelist
        """
        try:
            # Ensure output directory exists
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            
            filelist_path = os.path.join(temp_dir, "temp_filelist.txt")

            # Create filelist for ffmpeg concat
            with open(filelist_path, 'w') as f:
                for clip_file in clip_files:
                    f.write(f"file '{os.path.abspath(clip_file)}'\n")

            cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', filelist_path,
                '-c', 'copy',
                '-y',
                out_path
            ]

            print(f"Combining {len(clip_files)} clips into highlight video...")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                print(f"✓ Highlight video saved as: {out_path}")
                return True
            else:
                print(f"✗ Error combining clips: {result.stderr}")
                return False

        except Exception as e:
            print(f"✗ Error combining clips: {e}")
            return False

def check_json(json_input):
    json_stripped_str = strip_code_fences(json_input)

    try:
        parsed_stripped = json.loads(json_stripped_str)
        parsed_regular = json.loads(json_input)
    except json.JSONDecodeError:
        return {"ok": False, "error": "Input is not valid JSON"}
    if isinstance(parsed_regular, str):
        return (f"Regular json output is a str: {parsed_regular}")
    if isinstance(parsed_stripped, str):
        return (f"Stripped json output is a str: {parsed_stripped}")
    
    if isinstance(parsed_regular, json):
        return ("Regular json output is a json object: ", parsed_regular)
    if isinstance(parsed_stripped, json):
        return (f"Stripped json output is a json object: {parsed_stripped}")
    
    return ("Input is not a str or json object:", parsed_stripped, parsed_regular)
if __name__ == "__main__":
    file_name = "meshooting2.mp4"
    file_path = f"videoDataset/{file_name}"

    # Create an instance of your class
    highlighter = CreateHighlightVideo(video_path=file_path, output_dir="clips", combined_dir="combined", clip_duration=5)

    #slowed_file_path = f"videoDataset/{file_name.split('.')[0]}_slowed.mp4"
    #slow_down_video(file_path, slowed_file_path, speed_factor=0.5)
    #res = process_video_and_summarize(file_path)
    #make_timestamps = timestamp_maker(res)

    #make_timestamps_mock = ['00:00:11', '00:00:26', '00:00:48'] # timestamps for testing
    #highlighter.create_highlights_ffmpeg(make_timestamps)
    #highlighter.combine_clips_ffmpeg(output_filename=f"{file_name}_combined_video.mp4")
    #highlighter.clear_folder("clips")
    #print(make_timestamps)
    json_inp = json_input()
    res = check_json(json_inp)
    print(res)
