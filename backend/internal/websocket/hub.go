package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	schoolID string
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

type Message struct {
	Event    string      `json:"event"`
	Data     interface{} `json:"data"`
	SchoolID string      `json:"school_id,omitempty"`
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				if message.SchoolID == "" || client.schoolID == message.SchoolID {
					data, _ := json.Marshal(message)
					select {
					case client.send <- data:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(event string, data interface{}, schoolID string) {
	h.broadcast <- Message{
		Event:    event,
		Data:     data,
		SchoolID: schoolID,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
			}
			break
		}
	}
}

func (c *Client) WritePump() {
	defer func() {
		c.conn.Close()
	}()

	for message := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

func (h *Hub) ServeWs(conn *websocket.Conn, schoolID string) {
	client := &Client{
		hub:      h,
		conn:     conn,
		send:     make(chan []byte, 256),
		schoolID: schoolID,
	}
	h.register <- client

	go client.WritePump()
	go client.ReadPump()
}

var GlobalHub = NewHub()

func init() {
	go GlobalHub.Run()
	log.Println("WebSocket hub initialized")
}
