# Trustly

Trustly is a banking web application designed to manage and track financial activities. This project includes features such as balance tracking, savings deposit, virtual debit cards, transaction tracking and history, and balance transfers between Trustly accounts. **Note**: This application is a portfolio project and does not include a responsive layout (responsive CSS).

## Features

- **Balance Tracking**: Monitor your account balance in real-time.
- **Savings Deposit**: Deposit funds into your savings account.
- **Virtual Debit Cards**: Create and manage virtual debit cards.
- **Transaction Tracking and History**: View and manage your transaction history.
- **Balance Transfer**: Transfer funds between Trustly accounts.

## Installation

To set up and run the Trustly application locally, follow these steps:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/willsenyogi/Trustly.git
   ```

2. **Navigate to the Project Directory**
   ```bash
   cd Trustly
   ```
   
3.  **Install Dependencies**
   Ensure you have Node.js installed on your machine. Then, install the required Node.js packages:
   ```bash
   npm install
   ```

4. Set Up Environment Variables
   Create a .env file in the root directory of the project and add the following environment variables:
   ```bash
   MONGO_URI=your_mongo_database_uri
   PORT=your_preferred_port
   EMAIL_USER=your_email_address
   EMAIL_PASS=your_email_password
   SESSION_SECRET=your_session_secret
   ```

   - MONGO_URI: The connection string for your MongoDB database.
   - PORT: The port number on which the application will run.
   - EMAIL_USER: The email address used for Nodemailer.
   - EMAIL_PASS: The password for the email account used by Nodemailer.
   - SESSION_SECRET: A secret key for session management.
  
5. Run the Application
   Start the application with:
   ```bash
   npm start
   ```

## Usage
Once the application is running, you can:
- Fork the repository.
- Create a new branch for your changes.
- Commit your changes and push them to your forked repository.
- Open a Pull Request with a description of your changes.

## Contact
For questions or feedback, please contact willsenyp21@gmail.com or open an issue in the repository.

   

