# IELTS Writing Helper

This is a Next.js application that helps students prepare for the IELTS writing exam by providing instant feedback, band score estimation, and corrections using OpenAI.

## Features

- **Task Selection**: Support for both Task 1 and Task 2 essays.
- **AI Analysis**: detailed feedback on Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy.
- **Corrections**: visual feedback on specific errors with corrections and explanations.
- **Band Score**: estimated band score based on IELTS criteria.

## Getting Started

1.  **Install dependencies**:

    ```bash
    npm install
    ```

2.  **Set up Environment Variables**:

    Create a `.env.local` file in the root directory and add your OpenAI API key:

    ```env
    OPENAI_API_KEY=sk-your-openai-api-key-here
    ```

3.  **Run the development server**:

    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Stack

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components inspired by Aceternity UI (Framer Motion + Tailwind)
- **AI**: OpenAI GPT-4o
