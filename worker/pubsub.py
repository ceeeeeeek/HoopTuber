from google.cloud import pubsub_v1
import time
import os

project_id = "hooptuber-dev-1234"
subscription_name = "video-jobs-chris-sub"
credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

if credentials_path:
    print(f"Listening on {credentials_path}")

def callback(message):
    print(f"GOT MESSAGE: {message.data.decode('utf-8')}")
    message.ack()
try:
    subscriber = pubsub_v1.SubscriberClient()
    print("Successfully created Pub/Sub client")
except Exception as e:
    print(f"❌ Failed to create client: {e}")
    print("\nRun: gcloud auth application-default login")
    raise
subscriber = pubsub_v1.SubscriberClient()
sub_path = subscriber.subscription_path(project_id, subscription_name)

print(f"Listening on {sub_path}...")
future = subscriber.subscribe(sub_path, callback)

try:
    future.result()
except KeyboardInterrupt:
    future.cancel()