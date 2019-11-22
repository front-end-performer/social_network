import axios from './axios';

export async function receiveFriendsWannabes() {
    const { data } = await axios.get('/friends-wannabes');
    return {
        type: 'RECEIVEFRIENDSWANNABES_USERS',
        users: data
    };    
}

export async function acceptFriendRequest(id) {
    await axios.post(`/accept-friend-request/${id}`);
    return {
        type: 'ACCEPT_USERS',
        id
    };    
}

export async function endFriendShip(id) {
    await axios.post(`/end-friendship/${id}`);
    return {
        type: 'UNFRIEND_USERS',
        id
    };    
}

export function chatMessages(msgs) {
    return {
        type: 'USERS_MESSAGES',
        msgs: msgs
    };    
}

export function chatMessage(msg) {
    return {
        type: 'USER_MESSAGE',
        msg: msg
    };    
}

export function chatMessageNotitification(msgNot) {
    return {
        type: 'MESSAGE_NOTIFICATION',
        msgNot: msgNot
    };    
}

export function onlineUsers(onlnUsr) {
    return {
        type: 'ONLINE_USERS',
        onlnUsr: onlnUsr
    };    
}