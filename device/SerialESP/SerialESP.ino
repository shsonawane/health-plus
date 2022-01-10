/*
 *  This sketch read and writes data to ESP8266WiFi or NodeMCU.
 */

#include <ESP8266WiFi.h>
#include <ThingSpeak.h>

char* ssid = "Dlink_Router";
char* password = "159103067";
WiFiClient wifi_client; 

void setup() {
        Serial.begin(9600); 
        Serial.println();
        Serial.print("connecting to ");
        Serial.println(ssid);
        WiFi.mode(WIFI_STA);
        WiFi.begin(ssid, password);
        while (WiFi.status() != WL_CONNECTED) {
            delay(500);
            Serial.print(".");
         }
        Serial.println("");
        Serial.println("WiFi connected");
        Serial.println("IP address: ");
        Serial.println(WiFi.localIP());
        
        WiFiClientSecure client;
}

void loop() {
  float data;
        if (Serial.available() > 0) {
                data = Serial.parseFloat();
                delay(100);
                Serial.print("DATA : ");
                Serial.print(data);
                Serial.print("\n");
        }
}
