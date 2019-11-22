export const reducer = (state = {}, action) => { 
    if (action.type == 'RECEIVEFRIENDSWANNABES_USERS') {
        state = {
            ...state,
            users: action.users
        };
    }

    if (action.type == 'ACCEPT_USERS') {
        state = {
            ...state,
            users: state.users.map(
                user => {
                    if (user.id == action.id) {
                        return {
                            ...user,
                            accepted: action.type == 'ACCEPT_USERS'
                        };
                    } else {
                        return user;
                    }
                }
            )
        };
    }

    if (action.type == 'UNFRIEND_USERS') {
        state = {
            ...state,
            users: state.users.filter(
                user => user.id != action.id
            )
        };
    }

    if (action.type == 'USERS_MESSAGES') {
        state = {
            ...state,
            msgs: action.msgs
        };
    }

    if (action.type == 'USER_MESSAGE') {
        state = {
            ...state,
            msgs: state.msgs.concat(action.msg)
        };
    }

    if (action.type == 'MESSAGE_NOTIFICATION') {
        state = {
            ...state,
            msgNot: action.msgNot
        };
    }

    if (action.type === 'ONLINE_USERS') {
        state = {
            ...state,
            onlnUsr: action.onlnUsr
        };
    }

    return state;
};
