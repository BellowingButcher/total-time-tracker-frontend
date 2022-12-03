import { useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import toast, { Toaster } from "react-hot-toast";
import request from "../services/api.request";
import axios from "axios";
import authHeader from "../services/auth.headers";
import { API_URL, REFRESH_ENDPOINT } from "../services/auth.constants";

// todo: When uploading a schedule after refresh the page state still contains that file
//I need to make it to where after successful upload it clears the file state.

function ScheduleButton() {
  const client = axios.create({
    baseURL: API_URL,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const originalRequest = error.config;

      // Prevent infinite loops
      if (
        error.response.status === 401 &&
        originalRequest.url === API_URL + REFRESH_ENDPOINT
      ) {
        window.location.href = "";
        return Promise.reject(error);
      }

      if (
        error.response.data.code === "token_not_valid" &&
        error.response.status === 401 &&
        error.response.statusText === "Unauthorized"
      ) {
        const user = localStorage.getItem("user");

        if (user) {
          const tokenParts = JSON.parse(atob(user.refresh.split(".")[1]));

          // exp date in token is expressed in seconds, while now() returns milliseconds:
          const now = Math.ceil(Date.now() / 1000);
          console.log(tokenParts.exp);

          if (tokenParts.exp > now) {
            return client
              .post(REFRESH_ENDPOINT, { refresh: user.refresh })
              .then((response) => {
                localStorage.setItem("user", response.data);

                client.defaults.headers["Authorization"] =
                  "Bearer " + response.data.access;
                originalRequest.headers["Authorization"] =
                  "Bearer " + response.data.access;

                return client(originalRequest);
              })
              .catch((err) => {
                console.log(err);
              });
          } else {
            console.log("Refresh token is expired", tokenParts.exp, now);
            window.location.href = "";
          }
        } else {
          console.log("Refresh token not available.");
          window.location.href = "";
        }
      }

      // specific error handling done elsewhere
      return Promise.reject(error);
    }
  );
  const successNotify = () => toast.success("Successful Upload!");
  const failedNotify = () => toast.error("No File Selected!");
  let stamp = Date.now();
  const [file, setFile] = useState("");
  async function saveSchedule(downloadURL) {
    let options = {
      url: "/save/", // just the endpoint
      method: "post", // sets the method of the request
      data: {
        schedule: downloadURL,
        uploaded_by: client,
        beginning: "2022-11-06",
        ending: "2022-11-13",
        status: "True",
      },
    };
    let resp = await request(options); // await the response and pass in this fancy object of request options
    // setSomeState(resp.data) // set the response
  }

  const upload = () => {
    if (file == null) {
      return;
    } else {
      // 'file' comes from the Blob or File API

      const storage = getStorage();
      const storageRef = ref(storage, "file.xls" + stamp);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Observe state change events such as progress, pause, and resume
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
          switch (snapshot.state) {
            case "paused":
              console.log("Upload is paused");
              break;
            case "running":
              console.log("Upload is running");
              break;
          }
        },
        (error) => {
          // Handle unsuccessful uploads
          failedNotify();
        },
        () => {
          // Handle successful uploads on complete
          // For instance, get the download URL: https://firebasestorage.googleapis.com/...
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("File available at", downloadURL);
            saveSchedule(downloadURL);
          });
          successNotify();
          // todo: navigate or conditional render the success of the file being uploaded
          // get the path to the file after upload
          // store the path to the file in state
          // console.log('successful upload');
        }
      );
    }
  };

  return (
    <div>
      <li className="nav-item">
        <div className="" aria-current="page" href="#">
          <input
            type="file"
            onChange={(e) => {
              setFile(e.target.files[0]);
            }}
          />
          <button onClick={upload}>Upload</button>
          <Toaster />
        </div>
      </li>
    </div>
  );
}

{
  /* <>
  <li className="nav-item">
    <div className="" aria-current="page" href="#">
      <input
        type="file"
        onChange={(e) => {
          setFile(e.target.files[0]);
        }}
      />
      <button onClick={upload}>Upload</button>
    </div>
  </li>
</>; */
}

export default ScheduleButton;
