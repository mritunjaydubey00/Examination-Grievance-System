#include <iostream>
#include <string>
using namespace std;

class message
{
public:
    string messageText[100];

    int storeMessage()
    {
        int choice = 0;
        int thisline = 0;
        cout << "press B to go back" << endl;
        while (choice != 1)
        {
            if (thisline == 99)
            {
                cout << "Maximum length reached";
                return 0;
            }
            cout << "Enter Message text: ";
            // cin >> messageText[thisline];
            getline(cin, messageText[thisline]);
            if (messageText[thisline] == "b" || messageText[thisline] == "B")
            {
                choice = 1;
            }
            thisline++;
        }
        displayMessage();
        return 0;
    }

    void displayMessage()
    {
        cout << "~~~~~~~~~~" << endl;
        for (int i = 0; i < 100; i++)
        {
            cout << messageText[i];
        }
        cout << "~~~~~~~~~~" << endl;
    }
};

int main()
{

    return 0;
}