/*
 *  This sketch resets Ardunio Uno. 
 */

int resetPin = 12;

void setup() {  
  digitalWrite(resetPin, HIGH);
  delay(200);  
  pinMode(resetPin, OUTPUT);     
  Serial.begin(9600);
  Serial.println("reset");
  delay(200);
}

// the loop routine runs over and over again forever:
void loop() {
  delay(1000);               // wait for a second/ turn the LED off by making the voltage LOW
  Serial.println("off");
  delay(1000);               // wait for a second
  Serial.println("resetting");
  delay(10);
  digitalWrite(resetPin, LOW);
  delay(1000);
  Serial.println("this never happens");
  //this never happens because Arduino resets
}
