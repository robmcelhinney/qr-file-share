import React, {useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import axios from 'axios';
import Dropzone from 'react-dropzone';
import {setFiles} from "../js/actions/index.js"
import {getFiles} from '../utils/dirHelper'
import Snackbar from '@material-ui/core/Snackbar'
import MuiAlert from '@material-ui/lab/Alert'
import LinearProgress from '@material-ui/core/LinearProgress'
import {makeStyles, withStyles} from '@material-ui/core/styles'


function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = makeStyles((theme) => ({
    root: {
      width: '100%',
      '& > * + *': {
        marginTop: theme.spacing(2),
      },
    },
}))

const StyledLinearProgress = withStyles({
    root: {
      height: '1em',
      borderRadius: '1em'
    },
})(LinearProgress);


export const FileUpload = () => {
    const [uploadFile, setUploadFile] = useState([]); // storing the uploaded uploadFile
    const [progress, setProgess] = useState(0); // progess bar
    const [openToast, setOpenToast] = React.useState(false);
    const [openToastFailed, setOpenToastFailed] = React.useState(false);
    const [openToastSuccess, setOpenToastSuccess] = React.useState(false);

	const dispatch = useDispatch()

    const relDir = useSelector(state => state.relDir)

    const refreshFiles = async () => {
        const files = await getFiles(relDir);
        dispatch(setFiles(files))
    }

    const classes = useStyles()

    const handleChange = (acceptedFiles) => {
        setProgess(0)
        console.log("handleChange. acceptedFiles: ", acceptedFiles);
        setUploadFile(acceptedFiles); // storing uploadFile
        uploadFiles(acceptedFiles);
    }

    const uploadFiles = (files) => {
        let formData = new FormData();
        // console.log("uploadFiles: ", files)
        for (let i = 0; i < files.length; i++) {
            // console.log('files[i]', files[i])
            formData.append('file', files[i])
        }

        axios.post('/api/upload', formData, {
            onUploadProgress: (ProgressEvent) => {
                setOpenToast(true)
                let progress = Math.round(
                ProgressEvent.loaded / ProgressEvent.total * 100)
                setProgess(progress);
            }
        }).then(res => {
            console.log("uploaded. res: ", res)
            refreshFiles();
            setOpenToast(false)
            setOpenToastSuccess(true)
        }).catch(err => {
            console.log(err)
            setOpenToast(false)
            setOpenToastFailed(true)
        })
    }

    const handleClose = () => {
        setOpenToastSuccess(false)
        setOpenToastFailed(false)
        setOpenToast(false)
    };

    const displayUploadProgress = () => {
        console.log("displayUploadProgress. progress: ", progress)
        if (progress === 0) {
            return;
        }

        return (
            <>
            <div className="progessBar" style={{ width: progress }}
                    className={"mt-4"}>
                {progress}
            </div>
            <div className={classes.root + " h-8"}>
                <StyledLinearProgress variant="determinate" value={progress} className={"h-8"} />
            </div>
            </>
        )
    }

    const displayFile = () => {
        if (uploadFile.length === 0) {
            return
        }
        return (
            <div className={"mt-4"}>
                <strong>Files:</strong>
                <ul>
                {uploadFile.map(file => (
                    <li key={file.name}>{file.name}</li>
                ))}
                </ul>
            </div>
        )
    }


    return (
        <div>
            <section className="container">
            <Dropzone onDrop={handleChange}>
                {({ getRootProps, getInputProps }) => (
                <div {...getRootProps({ className: "dropzone" })}>
                    <input {...getInputProps()} />
                    <p>Drag'n'drop files, or click to select files</p>
                </div>
                )}
            </Dropzone>
            {displayFile()}
            </section>
            <hr />
            {displayUploadProgress()}

            {/* TOASTS */}
            <Snackbar open={openToast} autoHideDuration={5000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="info">
                    File{uploadFile.length > 1 ? "s" : ""} uploading
                </Alert>
            </Snackbar>

            <Snackbar open={openToastSuccess} autoHideDuration={5000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="success">
                    File{uploadFile.length > 1 ? "s" : ""} successfully uploaded
                </Alert>
            </Snackbar>

            <Snackbar open={openToastFailed} autoHideDuration={5000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error">
                    File{uploadFile.length > 1 ? "s" : ""} failed to upload
                </Alert>
            </Snackbar>
        </div>
    );
}