from django.test import SimpleTestCase


class HealthCheckTests(SimpleTestCase):
    def test_health_endpoints(self):
        for url in ("/health/", "/api/health/"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["status"], "ok")

    def test_health_without_trailing_slash(self):
        response = self.client.get("/health")
        self.assertRedirects(response, "/health/", status_code=301)
