import React, {useState, useEffect} from 'react';
import axios from 'axios';
import iconUpload from '../assets/icons/icon-upload.svg'
import {FileUpload} from './FileUpload'

export const Upload = () => {

    return (
        // <div className={"mb-10 md:mb-8 w-full max-w-full text-3xl"}
        //         onClick={}>
        //     Upload
        // </div>
        <FileUpload />
    );
}