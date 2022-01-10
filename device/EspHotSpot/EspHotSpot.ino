/*
 *  This sketch creates a hotspot of ESP8266WiFi or NodeMCU. 
 */

#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>

const char *ssid = "Health Plus";
const char *password = "123456789";

char *prv_ssid;
char *prv_password;

ESP8266WebServer server(80);

void handleRoot() {
server.send(200, "text/html", "<h2>Setup Device for Internet Connectivity</h2><form action=''> <input type='text' name='wifi' placeholder='Enter Wifi Name'> <br><br> <input type='password' name='pass' placeholder='Enter Password'> <br><br> <input type='submit' value='Connect'> </form>");
}

void setup() {

delay(1000);
Serial.begin(9600);
Serial.println();
Serial.print("Configuring access point...");
WiFi.softAP(ssid, password);
IPAddress myIP = WiFi.softAPIP();
Serial.print("AP IP address: ");
Serial.println(myIP);
server.on("/", handleRoot);
server.begin();
Serial.println("HTTP server started");
}

void loop() {
server.handleClient();
}
