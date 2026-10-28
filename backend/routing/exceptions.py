from rest_framework.views import exception_handler


def handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "error": {
                "code": "request_error",
                "message": "Request could not be processed.",
                "details": response.data,
            }
        }
    return response
