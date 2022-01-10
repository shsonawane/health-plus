/*
 *  This sketch creates a simple web server on NodeMCU to service serve simple 
 *  API over local WiFi.
 */

#include <ESP8266WiFi.h>            
#include <ESP8266WebServer.h>

const char* ssid = "Dlink_Router";
const char* password = "159103067";

ESP8266WebServer server(80);   //Web server object. Will be listening in port 80 (default for HTTP)

void setup() {

Serial.begin(9600);
WiFi.begin(ssid, password);
Serial.println("Waiting to connect");
while (WiFi.status() != WL_CONNECTED) {

delay(500);
Serial.print(".");

}

Serial.print("IP address: ");
Serial.println(WiFi.localIP());  //Print the local IP to access the server

server.on("/sensor", handleRequest);   //Associate the handler function to the path
server.begin();                                       //Start the server

Serial.println("Server listening");   

}

int req;

void loop() {
server.handleClient();    //Handling of incoming requests
}

void handleRequest() { 
String message = "";

if (server.arg("req")== ""){     //Parameter not found
    message = "Request Argument not found";
}else{     //Parameter found
    message = "Requested Sensor :";
    message += server.arg("req");     //Gets the value of the query parameter
    req = server.arg("req").toInt();
}

server.send(200, "text/plain", message);          //Returns the HTTP response
Serial.println("Request: ");
Serial.print(req);
}
