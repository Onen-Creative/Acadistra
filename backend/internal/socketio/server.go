package socketio

import (
	"log"

	socketio "github.com/googollee/go-socket.io"
)

var Server *socketio.Server

func InitSocketIO() (*socketio.Server, error) {
	server := socketio.NewServer(nil)

	server.OnConnect("/", func(s socketio.Conn) error {
		log.Println("Client connected:", s.ID())
		return nil
	})

	server.OnEvent("/", "join_room", func(s socketio.Conn, room string) {
		s.Join(room)
	})

	server.OnEvent("/", "leave_room", func(s socketio.Conn, room string) {
		s.Leave(room)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		log.Println("Client disconnected:", s.ID(), "Reason:", reason)
	})

	Server = server
	return server, nil
}

func BroadcastToRoom(room string, event string, data interface{}) {
	if Server != nil {
		Server.BroadcastToRoom("/", room, event, data)
	}
}

func Broadcast(event string, data interface{}) {
	if Server != nil {
		Server.BroadcastToNamespace("/", event, data)
	}
}
