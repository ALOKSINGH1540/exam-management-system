# 🎓 Exam Management System

A comprehensive, web-based Examination Management System designed to streamline the academic evaluation process. This platform provides secure, separate portals for students and administrators, efficiently handling everything from student registration to AI-powered notice generation.

## 🚀 Key Features

* **Role-Based Access Control:** Secure, isolated portals for Admins and Students.
* **Student Lifecycle Management:** Seamless student registration, profile management, and attendance tracking.
* **Exam Operations:** Automated generation and management of exam timetables and downloadable Admit Cards.
* **Result Processing:** Efficient grading and results management system.
* **AI Notice Generator:** Integrated with **Google Gemini AI API** to automatically draft professional academic notices and announcements.
* **Digital Resources:** Dedicated section for managing and sharing student study notes.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript
* **Backend:** Node.js, Express.js
* **Database:** MySQL (Cloud-hosted via Aiven/Railway)
* **AI Integration:** Google Gemini API
  

## ⚙️ Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file (do not upload this file to GitHub):

`DB_HOST` = Your MySQL Database Host URL
`DB_USER` = Your MySQL Database Username
`DB_PASSWORD` = Your MySQL Database Password
`DB_NAME` = Your MySQL Database Name
`GEMINI_API_KEY` = Your Google AI Studio API Key

## 💻 Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/ALOKSINGH1540/exam-management-system.git](https://github.com/ALOKSINGH1540/exam-management-system.git)
