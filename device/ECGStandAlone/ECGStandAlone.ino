/*
 *  This sketch reads ECG modules data over serial. 
 */
#include <Filters.h>

void setup() {
  // initialize the serial communication:
  Serial.begin(9600);
  pinMode(D1, INPUT); // Setup for leads off detection LO +
  pinMode(D2, INPUT); // Setup for leads off detection LO -
}

void loop(){
  int signalValue = analogRead(A0);
  Serial.println(signalValue);
  delay(10);                                //20ms delay
}
