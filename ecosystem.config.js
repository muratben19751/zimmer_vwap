module.exports = {
  apps: [
    {
      name: "zvwap",
      script: "C:\\Users\\MYDESK\\AppData\\Local\\Programs\\Python\\Python312\\python.exe",
      args: "-m uvicorn server:app --host 127.0.0.1 --port 8000",
      cwd: "C:\\myAI_Projects\\zimmer_vwap",
      interpreter: "none",
      autorestart: true,
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
  ],
};
