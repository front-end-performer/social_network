import React, { useState, useEffect } from 'react';
import axios from '../../../axios';

const FriendButton = ({ userParamsId }) => {
    const [btnstate, setBtnState] = useState('');
    useEffect(() => {
        (async () => {
            const { data } = await axios.get(`/get-initial-status/${userParamsId}`);
            
            if (data.length == 0) {
                setBtnState('make friend request');
            } else if (data[0].accepted == false) {
                setBtnState('accept friend request');
                if (userParamsId == data[0].receiver_id) {
                    setBtnState('cancel friend request');
                }
            } else if (data[0].accepted == true) {
                setBtnState('cancel friend request');
            }
        })();
    }, [userParamsId]);

    function handleBtnState() {
        if (btnstate === 'make friend request') {
            (async () => {
                await axios.post(`/send-friend-request/${userParamsId}`);
                setBtnState('cancel friend request');
            })();
        } else if (btnstate === 'accept friend request') {
            (async () => {
                await axios.post(`/accept-friend-request/${userParamsId}`);
                setBtnState('cancel friend request');
            })();
        } else if (btnstate === 'cancel friend request') {
            (async () => {
                await axios.post(`/end-friendship/${userParamsId}`);
                setBtnState('make friend request');
            })();
        }
    }

    return (
        <button
            className="smartBtn"
            onClick={() => handleBtnState()}
        >{btnstate}</button>
    );
};

export default FriendButton;