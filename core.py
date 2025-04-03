import sys
import os

if len(sys.argv) > 1:
    if sys.argv[1] == "help":
        print("help")
    elif sys.argv[1] == "version":
        print("version")
    else:
        print("unknown command")

