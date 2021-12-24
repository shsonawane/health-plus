# -*- coding: utf-8 -*-
"""
Created on Thu Mar 29 12:37:04 2018

@author: Shubham
"""

import heartbeat as hb
import sys

if __name__ == '__main__':
    hrdata = hb.get_data(sys.argv[1]+"/ecg.csv")
    measures = hb.process(hrdata, 100.0,windowsize=0.1 , report_time=True)
    measures.pop('interp_rr_function')
    measures.pop('interp_rr_linspace')
    print(measures)    
    plt = hb.plotter(title='')
    plt.grid(color='r', linestyle='-', linewidth=0.2)
    my_dpi = 96
    plt.savefig(sys.argv[1]+'/ecg.png', dpi = my_dpi*10, bbox_inches = 'tight')
   # plt.show()