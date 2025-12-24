"""

PROMPTS FOR GEMINI INPUT

"""        


def context_1():
    context1 = "This video is a video of a basketball player shooting around. Can you count how many shots he makes, as well as misses, as well as field goal percentage?"
    return context1

def context_2():    
    context2 = "This video is a video of a basketball player shooting around. Can you count how many shots he makes, as well as misses, as well as field goal percentage? A shot is defined as the player shooting the ball towards the hoop, and a make is defined as the ball going through the hoop. A miss is defined as the ball not going through the hoop. Please provide bullet points of each made and missed shot by timestamp."
    return context2
       
def context_3():
    context3 = "This video is a video of a full court basketball game, but only one half court of it. During the game, can you count how many shots are made in the video, as well as give the timestamps of each made shot in the video? A shot is defined as the player shooting the ball towards the hoop, and a make is defined as the ball going through the hoop. A miss is defined as the ball not going through the hoop. Please provide bullet points of each made and missed shot by timestamp."
    return context3

def prompt_4():
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
    return prompt4
def prompt_5():
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
    return prompt5
def prompt_6():
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
    return prompt6
def prompt_7():
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
    return prompt7

def json_input():
    json_inp =  {
    "```json\n[\n  {\n    \"Subject\": \"A man with a beard, wearing a white t-shirt, dark blue shorts, and white and grey shoes.\",\n    \"Location\": \"Top of the key\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:00:27\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man with a beard, wearing a white t-shirt, dark blue shorts, and white and grey shoes.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:00:33\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man wearing a black t-shirt with a small graphic on the chest and black pants.\",\n    \"Location\": \"Right elbow\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:01:00\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man with dark hair wearing a black t-shirt, blue and black patterned shorts, and white and black shoes.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:01:44\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man with dark hair wearing a black t-shirt, blue and black patterned shorts, and white and black shoes.\",\n    \"Location\": \"Top of the key\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:01:50\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man with dark hair wearing a black t-shirt, blue and black patterned shorts, and white and black shoes.\",\n    \"Location\": \"Right block\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:01:55\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man with dark hair wearing a black t-shirt, blue and black patterned shorts, and white and black shoes.\",\n    \"Location\": \"Left wing\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:02:03\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man with dark hair wearing a black t-shirt, blue and black patterned shorts, and white and black shoes.\",\n    \"Location\": \"Top of the key\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:02:11\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man with dark hair wearing a black t-shirt, blue and black patterned shorts, and white and black shoes.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:02:16\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man with dark hair wearing a black t-shirt, blue and black patterned shorts, and white and black shoes.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:02:20\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man wearing a white t-shirt and red shorts.\",\n    \"Location\": \"Right block\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:02:28\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man with dark hair wearing a black t-shirt, blue and black patterned shorts, and white and black shoes.\",\n    \"Location\": \"Left wing\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:02:35\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man wearing a white t-shirt and red shorts.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:02:47\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man with a beard, wearing a white t-shirt and dark shorts.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:03:00\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man with curly dark hair wearing a black reversible jersey with 'PALMER PARK' and the number 14 in white, over a grey t-shirt, with black pants and white shoes.\",\n    \"Location\": \"Right wing\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:03:10\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man wearing a black t-shirt and black shorts.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:03:28\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man with a beard, wearing a white t-shirt and dark shorts.\",\n    \"Location\": \"Top of the key\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:03:41\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man wearing a white tank top, white shorts, and blue shoes.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:04:06\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man wearing a black t-shirt and black shorts.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:04:22\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man with curly dark hair wearing a black reversible jersey with 'PALMER PARK' and the number 14 in white, over a grey t-shirt, with black pants and white shoes.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:04:44\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man with curly dark hair wearing a black reversible jersey with 'PALMER PARK' and the number 14 in white, over a grey t-shirt, with black pants and white shoes.\",\n    \"Location\": \"Right wing\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:05:16\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man with a beard, wearing a white t-shirt and dark shorts.\",\n    \"Location\": \"Left corner/Left baseline\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:05:35\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man wearing a black graphic t-shirt, black shorts, and sandals.\",\n    \"Location\": \"Right elbow\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:05:43\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man wearing a white tank top, white shorts, and blue shoes.\",\n    \"Location\": \"Right corner/Right baseline\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:06:07\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man wearing a white tank top, white shorts, and blue shoes.\",\n    \"Location\": \"Right wing\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:06:12\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man wearing a white tank top, white shorts, and blue shoes.\",\n    \"Location\": \"Right wing\",\n    \"ShotType\": \"Jumpshot\",\n    \"TimeStamp\": \"00:06:21\",\n    \"Outcome\": \"Miss\"\n  },\n  {\n    \"Subject\": \"A man wearing a black t-shirt and black shorts.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:06:44\",\n    \"Outcome\": \"Make\"\n  },\n  {\n    \"Subject\": \"A man with curly dark hair wearing a black reversible jersey with 'PALMER PARK' and the number 14 in white, over a grey t-shirt, with black pants and white shoes.\",\n    \"Location\": \"In the paint\",\n    \"ShotType\": \"Layup\",\n    \"TimeStamp\": \"00:07:06\",\n    \"Outcome\": \"Make\"\n  }\n]\n```"
    }
    return json_inp
    

def prompt_shot_outcomes_only():
    prompt = """Act as a world-class basketball analyst with a precise understanding of basketball shot mechanics and video analysis. 
    Your task is to analyze the entire video and identify every distinct shot attempt. 
    For each shot, focus only on the following key details:
    
        • Time Stamp of Shot (TimeStamp): Identify the exact timestamp of the shot, formatted as HH:MM:SS.
        • Make/Miss (Outcome): Determine whether the shot was successfully made or missed based on the trajectory, ball contact with the rim, or net movement. 
          If the outcome is not clearly visible, mark it as 'Undetermined'.
    
    Your response should be a structured JSON array of shot events, where each event is represented as an object with the keys 'TimeStamp' and 'Outcome'. 
    Do not include any explanations, text, or formatting such as code fences—output only the pure JSON."""
    return prompt

# subject
# location
# shotType
# timestamp (have)
# make / miss (have)
def prompt_shot_outcomes_only2(video_duration_sec):
    video_duration_min = video_duration_sec / 60

    desired_output = """[
    {"TimeStamp": 47, "Outcome": "Make"},
    {"TimeStamp": 185, "Outcome": "Miss"}
    ]"""
    if_duration = ""
    if video_duration_sec > 0:
        if_duration = f"""
            CRITICAL VIDEO ANALYSIS INSTRUCTIONS:
            - THIS VIDEO IS {video_duration_sec} seconds long.
            - DO NOT generate timestamps beyond {video_duration_sec} seconds
            - ONLY output timestamps that exist within the video
            - If you reach the end of the video, STOP analyzing
            """
    prompt = f"""
    Act as a world-class basketball analyst with a precise understanding of basketball shot mechanics.
    Analyze the video to identify every distinct shot attempt.
    A shot attempt is defined as any instance where a player shoots the basketball towards the hoop with the intention of scoring.
    Identify shots such as layups, jump shots, dunks, and three-pointers.
    {if_duration}
    RETURN OUTPUT AS A JSON ARRAY ONLY. NO MARKDOWN. NO CODE FENCES.
    For each shot, extract:
    1. "TimeStamp": The precise time of the shot in integer seconds.
       CRITICAL FORMATTING RULE: You MUST use seconds format.
       - Correct: "105" (for 1 minute 45 seconds)
       - Correct: "5" (for 5 seconds)
       - INCORRECT: "1:45", "01:45", "5s, 00:00:20"
    2. "Outcome": "Make", "Miss".
    ### EXAMPLE DESIRED OUTPUT:
        {desired_output}
    Analyze the video now and return the JSON array:
    """
    return prompt