import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By

class LuxArsFunctionalTest(unittest.TestCase):

    def setUp(self):
        self.driver = webdriver.Chrome()
        self.driver.implicitly_wait(5)

    def test_navegacion_y_titulo(self):
        driver = self.driver
        driver.get("http://localhost:5173") # URL de tu frontend React/Vite o Django
        self.assertIn("LuxArs", driver.title)

    def tearDown(self):
        self.driver.quit()

if __name__ == "__main__":
    unittest.main()