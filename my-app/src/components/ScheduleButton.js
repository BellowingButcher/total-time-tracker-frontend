import { useState, useEffect } from "react";
import { auth } from "../firebase";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
// import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import toast, { Toaster } from "react-hot-toast";
import request from "../services/api.request";
import { useGlobalState } from "../context/GlobalState";
// import SaveSchedule from "./SaveSchedule";
// todo: When uploading a schedule after refresh the page state still contains that file
//I need to make it to where after successful upload it clears the file state.

function ScheduleButton() {
  const [state, dispatch] = useGlobalState();
  const successNotify = () => toast.success("Successful Upload!");
  const failedNotify = () => toast.error("No file selected!");
  const existsNotify = () =>
    toast.error(
      "A schedule containing these dates already exists! Try another or delete the existing schedule."
    );
  let stamp = Date.now();
  const [file, setFile] = useState("");
  const upload = () => {
    if (file === null) {
      return;
    } else {
      // 'file' comes from the Blob or File API

      const storage = getStorage();
      const storageRef = ref(storage, stamp + 'file.xls');

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
            default:
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
            request({
              url: "/save/",
              method: "POST",
              data: {
                blob_name: storageRef,
                schedule: downloadURL,
                uploaded_by: state.currentUser.user_id,
              },
            }).then((res) => {
              // existsNotify();
              console.log(res);
            });
            
            //TODO:Make a conditional success notification of an upload to the models
            // successNotify();
          });
        }
      );
    }
  };
  // if (message.includes("Schedule already exists")) {
  //   return <OverRidePopUp />;
  // } else {
  return (
    <div>
      <div className="pt-4" aria-current="page">
        <div className="input-group mb-3">
          {/* it is not updating the state of file on change here!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */}
          <input
            type="file"
            className="form-control"
            onChange={(e) => {
              setFile(e.target.files[0])
            }}
          />
          <label className="input-group-text bg-success">
            <div className="text-white" onClick={upload}>
              Upload
            </div>
          </label>
        </div>
        <Toaster />
      </div>
    </div>
  );
}
// }

export default ScheduleButton;
