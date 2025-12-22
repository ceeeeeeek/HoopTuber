import gspread
import os


def write_to_sheet(job_id, data):
    ss_creds = os.getenv('SHEETS_CREDS')
    gc = gspread.service_account(filename=ss_creds)