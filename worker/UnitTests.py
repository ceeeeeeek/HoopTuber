from VideoInputTest import process_video_and_summarize, client, CreateHighlightVideo2, timestamp_maker, strip_code_fences
import json

if __name__ == "__main__":
    
    file_path = "videoDataset/meshooting2.mp4"
    res = process_video_and_summarize(file_path)
    print(f"DEBUG: gemini is outputting: {type(res)}, coming from worker/VideoInputTest.py")
    print(f"DEBUG: Gem output: {res}\n")
    #if not isinstance(res, str) or not isinstance(res, list) or not isinstance(res, dict):
     #   parsed_data = json.loads(res)
    parsed_data = res
    if isinstance(res, str):
        parsed_data = json.loads(res)
    

    print(f"DICT DEBUG: Trying to parse data: {type(parsed_data)}")
    print(f"DICT DEBUG: Parsed data to JSON: {parsed_data}\n")
    print(f"DICT DEBUG: Check if program can read data")
    for shot in parsed_data:
        if shot["Outcome"].lower() == "make":
            print(f"Made shot at: {shot['TimeStamp']}")
        elif shot["Outcome"].lower() == "miss":
            print(f"Missed shot at {shot['TimeStamp']}")
    """
    WORKING: Using analyze function with only timestamps working
    NEED: 
    """
    for shot in parsed_data:
        print(shot)
    