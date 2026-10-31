# Install PlateWise on your Android phone

Three parts: put the server online (Render), build the app (Expo), install it on your phone.
Both services have free plans. Your Gemini key only goes on the server, never inside the app.

## Part 1: put the server online (about 10 minutes, any browser)

1. Go to **https://render.com** and sign up with **GitHub** (the account that can see `monraj/mlproject`).
2. Click **New → Blueprint**. Pick the **mlproject** repository and the branch
   **ccr-25db0cb7-ra64nh** (or `main`, once this work is merged).
3. Render reads `render.yaml` and shows a service called **platewise-api**. It asks for
   **GEMINI_API_KEY**: paste your Gemini key there. Click **Apply**.
4. Wait for the deploy to show **Live** (about 3–5 minutes).
5. Note two things from the service page:
   - the address at the top, like `https://platewise-api-abcd.onrender.com`
   - **Environment → APP_ACCESS_CODE**: click the eye icon and copy the code. Render made it up for you;
     the app needs it so strangers can't use your Gemini key.
6. Check it: open `https://YOUR-ADDRESS.onrender.com/health` in a browser. You should see
   `"ai":"gemini"` and `"demo":false`.

7. Optional: open `https://YOUR-ADDRESS.onrender.com/admin` for the **server console** (status, food
   table, try-it, activity). Its password is **Environment → ADMIN_PASSWORD**.

The free plan puts the server to sleep after 15 minutes without use. The first scan after that takes
up to a minute while it wakes up; later ones are quick.

## Part 2: build the app (about 5 minutes of typing, then 15–20 minutes of waiting)

You need a computer with **Node.js 20+** (https://nodejs.org) and a free account at **https://expo.dev**.

```bash
git clone https://github.com/monraj/mlproject.git
cd mlproject
git checkout ccr-25db0cb7-ra64nh
cd platewise/mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Answer **Yes** when it asks to create an EAS project and to generate an Android keystore.
The build runs on Expo's servers. When it finishes, it prints a **link and a QR code**.

## Part 3: install on your phone

1. Open the link on your phone (or scan the QR code with the phone camera) and tap **Install** /
   download the `.apk` file.
2. Open the downloaded file. If Android asks, allow **Install unknown apps** for your browser.
3. If Google Play Protect warns about an unknown developer, tap **More details → Install anyway**.
   (It warns because the app isn't from the Play Store.)
4. Open **PlateWise**, enter your details and pick a pace.
5. Go to **Me → PlateWise server**: paste the **server address** and the **access code** from Part 1,
   then tap **Save and connect**. It should say **Connected · AI by gemini**.

Done. Snap a meal to try it.

## Updating later

When the app changes, run the `eas-cli build` command again and install the new APK over the old one.
Your log stays on the phone. To change the Gemini key, edit **GEMINI_API_KEY** on Render; the app
doesn't need rebuilding.
