import os
import google.genai as genai
from dotenv import load_dotenv
import time
from moviepy.editor import VideoFileClip, vfx
load_dotenv()

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
            raise ValueError("File processing failed.")
        print("File processing complete.")

        print("Generating summary...")
        
        # CHANGE SCRIPT IN CONTENTS ARRAY 
        context1 = "This video is a video of a basketball player shooting around. Can you count how many shots he makes, as well as misses, as well as field goal percentage?"
        context2 = "This video is a video of a basketball player shooting around. Can you count how many shots he makes, as well as misses, as well as field goal percentage? A shot is defined as the player shooting the ball towards the hoop, and a make is defined as the ball going through the hoop. A miss is defined as the ball not going through the hoop. Please provide bullet points of each made and missed shot by timestamp."
        context3 = "This video is a video of a full court basketball game, but only one half court of it. During the game, can you count how many shots are made in the video, as well as give the timestamps of each made shot in the video? A shot is defined as the player shooting the ball towards the hoop, and a make is defined as the ball going through the hoop. A miss is defined as the ball not going through the hoop. Please provide bullet points of each made and missed shot by timestamp."
        prompt4 = """Act as a world-class basketball analyst with a deep understanding of shot mechanics, court geography, and statistical analysis. Your task is to meticulously analyze the entire video to identify every distinct shot attempt. The analysis should be comprehensive and structured for clarity. For the video provided, please provide a detailed report on every shot attempt, including the following analysis for each one:
                    Subject Recognition (SR): Identify the player who is either shooting the ball or in the immediate process of a layup.
                    Shot Location (SL): Based on the player's position on the court, categorize the shot location from the following list:
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
                    Shot Type (ST): Determine if the shot is a 'Jumpshot' or a 'Layup'.
                    Time Stamp of Shot (TS): Identify the exact timestamp of the shot, formatted as HH:MM:SS.
                    Make/Miss (MM): Analyze the position of the ball relative to the hoop, the player's follow-through, and the surrounding context (e.g., net movement) to determine the outcome. Conclude whether the shot is a 'Make' or a 'Miss'. If the outcome is not determinable, state 'Undetermined'.
                    Your response should be formatted as a structured JSON object containing a list of shot events, with each event represented as a separate object."""
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
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[uploaded_file, prompt6],
        )
        print("Response received:")
        print(response.text)
        return response.text

    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")
        return None


if __name__ == "__main__":
    file_name = "Game1SideA.mp4"
    file_path = f"videoDataset/{file_name}"
    #slowed_file_path = f"videoDataset/{file_name.split('.')[0]}_slowed.mp4"
    #slow_down_video(file_path, slowed_file_path, speed_factor=0.5)
    process_video_and_summarize(file_path)