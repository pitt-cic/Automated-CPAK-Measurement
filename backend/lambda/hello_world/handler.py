import json


def handler(event, _context):
    print("hello world")
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
        },
        "body": json.dumps({"message": "hello world from Lambda"})
    }
