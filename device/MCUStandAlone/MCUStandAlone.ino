/*
 *  This sketch creates a simple web server on NodeMCU to service serve simple 
 *  API over local WiFi. Its also setup NodeMUC connection with WebApp. 
 */

#include <ESP8266WiFi.h>  
#include <WiFiClient.h>  
#include <ThingSpeak.h>  
#include <ESP8266WebServer.h>

const char *ssid = "Health Plus";
const char *password = "123456789";

char *prv_ssid;
char *prv_password;

ESP8266WebServer server(80);

void handleRoot() {
server.send(200, "text/html", "<h1>You are connected</h1>");
}

 WiFiClient client;  
 unsigned long myChannelNumber = 406202;  
 const char * myWriteAPIKey = "EBTA6U3LT437OPSS";  

int web_wifi = 0;
 
 void setup()  
 {  
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
 
 void loop()   
 {  
  if(web_wifi == 1){
      // Connect to WiFi network  
    delay(10);
    Serial.println();  
    Serial.print("Connecting to ");  
    Serial.println(ssid);  
    WiFi.begin(prv_ssid, prv_password);  
    while (WiFi.status() != WL_CONNECTED)  
    {  
        delay(500);  
        Serial.print(".");  
    }  
    Serial.println("");  
    Serial.println("WiFi connected");  
    // Print the IP address  
    Serial.println(WiFi.localIP());  
    ThingSpeak.begin(client); 
  }else
  if(web_wifi == 2){
    float data;
        if (Serial.available() > 0) {
                data = (getTemp()+6) * 9 / 5 + 32;
                delay(1000);  
                if(data > 0){
                  ThingSpeak.writeField(myChannelNumber, 2, data, myWriteAPIKey); 
                } 
        }
  }else{
        server.handleClient();
  }
 }  
