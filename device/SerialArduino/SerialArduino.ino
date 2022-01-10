/*
 *  This sketch read and writes data to Arduino.
 */

#include <OneWire.h>
#include <DallasTemperature.h>
#include "SPI.h"
#define ONE_WIRE_BUS 8
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

int prevCount=1;
int countbeats[] = {
  0, 0, 0};
int prevbeat[] = {
  0, 0, 0};

//VARIABLES
int pulsePin = 0;                 // Pulse Sensor purple wire connected to analog pin 0
int blinkPin = 6; 

// these variables are volatile because they are used during the interrupt service routine!
volatile int BPM;                   // used to hold the pulse rate
volatile int Signal;                // holds the incoming raw data
volatile int IBI = 2000;             // holds the time between beats, must be seeded! 
volatile boolean Pulse = false;     // true when pulse wave is high, false when it's low
volatile boolean QS = false;        // becomes true when Arduoino finds a beat.             

void setup(){    
  Serial.begin(9600);  
  interruptSetup();           
}

void loop(){
if (Serial.available() > 0) {
  int req = Serial.parseInt();
  delay(1000); 
  if(req == 1){
      float temp = ( getTemp()+5) * 9 / 5 + 32; 
      Serial.print(temp);
  }else   if(req == 2){
       int pulse = heartBeat(); 
       Serial.print(pulse);
  }else if(req == 3){
        float ecg = getECG(); 
        Serial.print(ecg);
  }
  Serial.flush();
} 
}


float getTemp(){
  float result = 0;  
  sensors.begin();
  delay(1000);
  sensors.requestTemperatures(); 
  result = sensors.getTempCByIndex(0);
  return result;
}

int heartBeat(){
  int i = 0;
  int sum = 0 ;
while(1){
    delay(1000);
if (QS == true){    
    countbeats[2] = BPM % 10;
    //How to handle the middle digit depends on if the
    //the speed is a two or three digit number
    if(BPM > 99){
      countbeats[1] = (BPM / 10) % 10;
    }
    else{
      countbeats[1] = BPM / 10;
    }
    //Grab the first digit
    countbeats[0] = BPM / 100;
    
    prevbeat[2] = prevCount % 10;
    if(prevCount > 99){
      prevbeat[1] = (prevCount / 10) % 10;
    }
    else{
      prevbeat[1] = prevCount / 10;
    }
    prevbeat[0] = prevCount / 100;
 
    QS = false;   
    if(i<5){
         sum += BPM;
         i++;
    }else{
         return sum/5;
    }
  }
}
}

float getSparrow(){
  float result = 3.3;  
  return result;
}

float getECG(){
  float result = 4.4;  
  return result;
}

