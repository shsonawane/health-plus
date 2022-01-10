/*
 *  This sketch processes pulse rate data and writes same on Serial.
 */

#define pulsePin A0

//  VARIABLES
int rate[10];                    
unsigned long sampleCounter = 0; 
unsigned long lastBeatTime = 0;  
unsigned long lastTime = 0, N;
int BPM = 0;
int IBI = 0;
int P = 512;
int T = 512;
int thresh = 512;  
int amp = 100;                   
int Signal;
boolean Pulse = false;
boolean firstBeat = true;          
boolean secondBeat = true;
boolean QS = false;    
int x = 0;
int s = 0;

void setup() {
  Serial.begin(9600);

}

void loop() {

              if (QS == true) {
                Serial.println("BPM: "+ String(BPM));
                s += BPM;
                x++;
                QS = false;
              } else if (millis() >= (lastTime + 2)) {
                readPulse(); 
                lastTime = millis();
              }     
              if(x == 10){
                Serial.println("BMP AVG = " + String(s/x));
              }
}



void readPulse() {

  Signal = analogRead(pulsePin);              
  sampleCounter += 2;                           
  int N = sampleCounter - lastBeatTime;   

  detectSetHighLow();

  if (N > 250) {  
    if ( (Signal > thresh) && (Pulse == false) && (N > (IBI / 5) * 3) )
      pulseDetected();
  }

  if (Signal < thresh && Pulse == true) {  
    Pulse = false;
    amp = P - T;
    thresh = amp / 2 + T;  
    P = thresh;
    T = thresh;
  }

  if (N > 2500) {
    thresh = 512;
    P = 512;
    T = 512;
    lastBeatTime = sampleCounter;
    firstBeat = true;            
    secondBeat = true;           
  }

}

void detectSetHighLow() {

  if (Signal < thresh && N > (IBI / 5) * 3) {
    if (Signal < T) {                       
      T = Signal;                         
    }
  }

  if (Signal > thresh && Signal > P) {    
    P = Signal;                           
  }                                       

}

void pulseDetected() {
  Pulse = true;                           
  IBI = sampleCounter - lastBeatTime;     
  lastBeatTime = sampleCounter;           

  if (firstBeat) {                       
    firstBeat = false;                 
    return;                            
  }
  if (secondBeat) {                    
    secondBeat = false;                
    for (int i = 0; i <= 9; i++) {   
      rate[i] = IBI;
    }
  }

  word runningTotal = 0;                   

  for (int i = 0; i <= 8; i++) {          
    rate[i] = rate[i + 1];            
    runningTotal += rate[i];          
  }

  rate[9] = IBI;                      
  runningTotal += rate[9];            
  runningTotal /= 10;                 
  BPM = 60000 / runningTotal;         
  QS = true;                              
}
